let
  nixpkgs-mozilla = import (builtins.fetchTarball https://github.com/mozilla/nixpkgs-mozilla/archive/master.tar.gz);
  pkgs = import <nixpkgs> { overlays = [ nixpkgs-mozilla ]; };

  rustChannel = (pkgs.rustChannelOf { date = "2020-11-27"; channel = "nightly"; });
  # rustChannels.nightly.rust
in
pkgs.mkShell {
  buildInputs = with pkgs; [
    rustChannel.rust
    rustfmt
    rls
    cargo-edit
    nodejs
  ];

  RUST_LOG = "info";

  shellHook = ''
    uisetup() {
      pushd ui
      npm install
      popd
    }

    uiserver() {
      pushd ui
      npm run start
      popd
    }
  '';
}
