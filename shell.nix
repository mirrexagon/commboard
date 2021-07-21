{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    rustc
    cargo

    rustfmt
    rust-analyzer
    cargo-edit

    nodejs
  ];

  RUST_LOG = "info";
  NODE_ENV = "development";
}
