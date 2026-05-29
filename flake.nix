{
  description = "Commboard, a multi-dimensional Kanban board";

  inputs = {
    nixpkgs.url = "nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };

        # Fixed-output derivation: populate an offline Deno module cache
        # (DENO_DIR) with every remote dependency the project needs.
        #
        # The @esbuild/* platform-specific packages are intentionally kept in
        # the cache so that Deno can resolve the esbuild npm package fully
        # offline.  The wrapper sets ESBUILD_BINARY_PATH to the nixpkgs esbuild
        # binary, so the cached platform binary is never actually executed.
        #
        # The cache content includes a platform-native esbuild binary, so the
        # hash is system-specific.  To (re)compute it for your platform:
        #   1. Set outputHash = pkgs.lib.fakeHash
        #   2. Run `nix build` — Nix will print the correct hash in the error
        #   3. Replace pkgs.lib.fakeHash with the printed sha256-… string
        denoDeps = pkgs.stdenv.mkDerivation {
          name = "commboard-deno-deps";
          src = ./.;

          nativeBuildInputs = [ pkgs.deno ];

          buildPhase = ''
            export HOME=$TMPDIR
            export DENO_NO_UPDATE_CHECK=1
            export DENO_DIR=$TMPDIR/deno-cache
            mkdir -p "$DENO_DIR"

            # Cache server-side deps (npm:esbuild, jsr:@luca/esbuild-deno-loader, …)
            deno cache --config=deno.json --lock=deno.lock main.ts

            # Cache UI deps (npm:preact, npm:marked, …) — resolved by
            # esbuild-deno-loader at server startup, so they must be present
            # in the offline cache.
            deno cache --config=deno.json --lock=deno.lock ui/main.tsx
          '';

          installPhase = ''
            cp -r "$DENO_DIR" "$out"
          '';

          # Skip fixup phases (patchelf, strip, …) — this is a module cache,
          # not a compiled binary, and we don't want Nix touching its contents.
          dontFixup = true;

          outputHashMode = "recursive";
          outputHashAlgo = "sha256";
          outputHash = "sha256-Q2cq/kQ/WUfIjjPunPT4DkRTzHvkFU+PjPrUCaf7rPc=";
        };
      in
      {
        packages.default = pkgs.writeShellApplication {
          name = "commboard";

          # deno and esbuild are added to PATH inside the generated wrapper.
          runtimeInputs = [ pkgs.deno pkgs.esbuild ];

          text = ''
            # Deno requires a *writable* DENO_DIR: it updates SQLite WAL files,
            # compiled-output caches, etc.  On first run (and after an upgrade)
            # we copy the Nix-provided offline cache to a per-user directory.
            _STORE_DEPS="${denoDeps}"
            _COMMBOARD_SRC="${./.}"
            _CACHE_DIR="''${XDG_CACHE_HOME:-$HOME/.cache}/commboard"
            _DENO_CACHE="$_CACHE_DIR/deno"
            _STAMP="$_CACHE_DIR/.deno-deps-stamp"

            _current_stamp=""
            if [ -f "$_STAMP" ]; then
              _current_stamp="$(cat "$_STAMP")"
            fi

            if [ "$_current_stamp" != "$_STORE_DEPS" ]; then
              printf 'commboard: initialising Deno module cache…\n' >&2
              rm -rf "$_DENO_CACHE"
              mkdir -p "$_DENO_CACHE"
              cp -r "$_STORE_DEPS/." "$_DENO_CACHE/"
              chmod -R u+w "$_DENO_CACHE"
              mkdir -p "$(dirname "$_STAMP")"
              printf '%s' "$_STORE_DEPS" > "$_STAMP"
            fi

            export DENO_DIR="$_DENO_CACHE"
            # Use the nixpkgs esbuild binary instead of the npm-cached one.
            export ESBUILD_BINARY_PATH="${pkgs.esbuild}/bin/esbuild"
            export DENO_NO_UPDATE_CHECK=1

            exec deno run \
              --lock "$_COMMBOARD_SRC/deno.lock" \
              --frozen \
              --allow-read \
              --allow-write \
              --allow-net \
              --allow-env \
              --allow-run \
              "$_COMMBOARD_SRC/main.ts" \
              "$@"
          '';
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [ deno ];
        };
      }
    );
}
