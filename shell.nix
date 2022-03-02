{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    rustc
    cargo

    cargo-edit
  ];

  RUST_LOG = "info";
}
