let
  nixpkgs-mozilla = import (builtins.fetchTarball https://github.com/mozilla/nixpkgs-mozilla/archive/master.tar.gz);
  pkgs = import <nixpkgs> { overlays = [ nixpkgs-mozilla ]; };

  rustChannel = (pkgs.rustChannelOf { date = "2021-04-30"; channel = "nightly"; });
  # rustChannels.nightly.rust
in
pkgs.mkShell {
  buildInputs = with pkgs; [
    rustChannel.rust
    rustfmt
    rust-analyzer
    cargo-edit

    nodejs
  ];

  RUST_LOG = "info";
  NODE_ENV = "development";
}
