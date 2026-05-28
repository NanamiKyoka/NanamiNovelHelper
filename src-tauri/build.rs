fn main() {
    let pkg_json_path = std::path::PathBuf::from("../package.json");
    if let Ok(content) = std::fs::read_to_string(&pkg_json_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(version) = json.get("version").and_then(|v| v.as_str()) {
                println!("cargo:rustc-env=APP_VERSION={}", version);
            }
        }
    }
    tauri_build::build()
}
