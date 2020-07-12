use std::path::Path;
use std::process::Command;

use walkdir::WalkDir;

const UI_DIR: &str = "ui";
const UI_WATCH_DIR: &str = "ui/src";

fn main() {
    println!("cargo:rerun-if-changed=build.rs");

    // Re-run build script if the UI code changes.
    for entry in WalkDir::new(UI_WATCH_DIR) {
        let entry = entry.expect("Could not read directory for adding to rerun-if-changed");
        println!("cargo:rerun-if-changed={}", entry.path().display());
    }

    // Build the UI.
    let build_output = Command::new("npm")
        .current_dir(UI_DIR)
        .arg("run")
        .arg("build")
        .output()
        .expect("Failed to build UI");

    assert!(
        build_output.status.success(),
        "Failed to build UI: npm exited with {:#?}",
        build_output.status.code()
    );
}
