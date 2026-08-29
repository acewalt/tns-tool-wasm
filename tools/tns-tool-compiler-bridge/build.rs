fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        // Keep the local compiler completely in the background when it is
        // launched from tnstool:// or by the installer.  mainCRTStartup keeps
        // Rust's normal main() entry point while the PE uses the WINDOWS
        // subsystem, so Explorer/browser launches do not allocate a console.
        println!("cargo:rustc-link-arg=/SUBSYSTEM:WINDOWS");
        println!("cargo:rustc-link-arg=/ENTRY:mainCRTStartup");
    }
}
