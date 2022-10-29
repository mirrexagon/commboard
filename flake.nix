{
  description = "Commboard, a multi-dimensional Kanban board";

  inputs = {
    nixpkgs = { url = "nixpkgs/nixos-unstable"; };

    flake-utils = { url = "github:numtide/flake-utils"; };

    npmlock2nix = {
      url = "github:nix-community/npmlock2nix";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, flake-utils, npmlock2nix }: {
    overlays.default = final: prev:
      let
        commboardDrv =
          { stdenv
          , lib
          , rustPlatform
          , fetchFromGitHub
          , npmlock2nix
          , nodejs
          }:
          rustPlatform.buildRustPackage rec {
            pname = "commboard";
            version = "git";

            src = ./.;

            nativeBuildInputs = [
              nodejs
            ];

            cargoHash = "sha256-r0EAj0xTl3cSgUwFhEXuTthqEzy0YbeRe/mG0LnJQak=";

            nodeDependencies = npmlock2nix.node_modules {
              src = ./ui;
            };

            preBuild = ''
              ln -s $nodeDependencies/node_modules ./ui/node_modules
              export PATH="$nodeDependencies/bin:$nodejs/bin:$PATH"
            '';

            doCheck = false;

            meta = with lib; {
              description = "A multi-dimensional Kanban board";
              homepage = "https://github.com/mirrexagon/commboard";
              license = with licenses; [ bsd0 ];
              maintainers = with maintainers; [ mirrexagon ];
            };
          };

      in
      {
        commboard = prev.callPackage commboardDrv {
          npmlock2nix = (import npmlock2nix) { pkgs = final; };
        };
      };
  } // flake-utils.lib.eachDefaultSystem (system:
    let
      pkgs = import nixpkgs { inherit system; overlays = [ self.overlays.default ]; };
    in
    {
      packages.default = pkgs.commboard;

      devShells.default =
        pkgs.mkShell
          {
            buildInputs = with pkgs; [
              rustc
              cargo

              cargo-edit

              nodejs
            ];

            NODE_ENV = "development";
          };
    });
}
