{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    rustc
    cargo

    cargo-edit

    nodejs
  ];

  RUST_LOG = "info";
  NODE_ENV = "development";
}
