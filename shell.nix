let
  nixpkgs-mozilla = import (builtins.fetchTarball https://github.com/mozilla/nixpkgs-mozilla/archive/master.tar.gz);
  pkgs = import <nixpkgs> { overlays = [ nixpkgs-mozilla ]; };
in

pkgs.mkShell {
  buildInputs = with pkgs; [
    latest.rustChannels.nightly.rust
  ];

  # CURL_CA_BUNDLE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
}
