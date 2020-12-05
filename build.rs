use std::process::Command;

use walkdir::WalkDir;

const UI_DIR: &str = "ui";
const UI_WATCH_DIRS: [&str; 2] = ["ui/src", "ui/public"];

fn main() {
    println!("cargo:rerun-if-changed=build.rs");

    // Re-run build script if the UI code changes.
    for dir in &UI_WATCH_DIRS {
        for entry in WalkDir::new(dir) {
            let entry = entry.expect("Could not read directory for adding to rerun-if-changed");
            println!("cargo:rerun-if-changed={}", entry.path().display());
        }
    }

    println!("cargo:rerun-if-changed=ui/package.json");
    println!("cargo:rerun-if-changed=ui/webpack.config.js");
    println!("cargo:rerun-if-changed=ui/.swcrc");

    // Build the UI.
    let profile = std::env::var("PROFILE").unwrap();
    let npm_action = match profile.as_str() {
        "debug" => "build-dev",
        "release" => "build",
        _ => unimplemented!(),
    };

    let build_output = Command::new("npm")
        .current_dir(UI_DIR)
        .arg("run")
        .arg(npm_action)
        .output()
        .expect("Failed to build UI");

    assert!(
        build_output.status.success(),
        "Failed to build UI: npm exited with {:?}\n\n{}\n\n{}",
        build_output.status.code(),
        String::from_utf8_lossy(&build_output.stdout),
        String::from_utf8_lossy(&build_output.stderr)
    );
}
