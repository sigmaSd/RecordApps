const gtk4Symbols = {
  gtk_application_window_new: {
    parameters: ["pointer"],
    result: "pointer",
  },
  gtk_widget_show: { parameters: ["pointer"], result: "void" },
  gtk_window_set_title: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_window_set_default_size: {
    parameters: ["pointer", "i32", "i32"],
    result: "void",
  },
} as const;

const glibSymbols = {
  g_application_run: {
    parameters: ["pointer", "i32", "pointer"],
    result: "i32",
  },
  g_signal_connect_data: {
    parameters: [
      "pointer",
      "pointer",
      "pointer",
      "pointer",
      "pointer",
      "i32",
    ],
    result: "u64",
  },
} as const;

const adwSymbols = {
  adw_application_new: {
    parameters: ["pointer", "i32"],
    result: "pointer",
  },
  adw_init: { parameters: [], result: "void" },
} as const;

export class AdwApp {
  id: string;
  gtk4: Deno.DynamicLibrary<typeof gtk4Symbols>;
  glib: Deno.DynamicLibrary<typeof glibSymbols>;
  adw: Deno.DynamicLibrary<typeof adwSymbols>;
  app: Deno.PointerValue;

  activateCallback?: Deno.UnsafeCallback<
    {
      readonly parameters: readonly ["pointer", "pointer"];
      readonly result: "void";
    }
  >;

  constructor({ id: appId }: { id: string }) {
    this.id = appId;
    const gtkLibraryName = "libgtk-4.so.1";
    const gLibraryName = "libgio-2.0.so.0";
    const adwLibraryName = "libadwaita-1.so.0";

    // Load GTK4 library
    this.gtk4 = Deno.dlopen(gtkLibraryName, gtk4Symbols);

    // Load GLib library
    this.glib = Deno.dlopen(gLibraryName, glibSymbols);

    // Load Adwaita library
    this.adw = Deno.dlopen(adwLibraryName, adwSymbols);

    this.adw.symbols.adw_init();

    const appIdCStr = new TextEncoder().encode(appId + "\0");
    const appIdPtr = Deno.UnsafePointer.of(appIdCStr);
    const flags = 0; // G_APPLICATION_FLAGS_NONE
    this.app = this.adw.symbols.adw_application_new(appIdPtr, flags);
  }

  run(f?: (window: Deno.PointerValue) => void) {
    // Define our activate callback
    this.activateCallback = new Deno.UnsafeCallback(
      { parameters: ["pointer", "pointer"], result: "void" },
      (_app, _userData) => {
        // Create a window for the application
        const window = this.gtk4.symbols.gtk_application_window_new(this.app);

        // Set window properties
        const titleStr = new TextEncoder().encode("Deno Webview\0");
        const titlePtr = Deno.UnsafePointer.of(titleStr);
        this.gtk4.symbols.gtk_window_set_title(window, titlePtr);
        this.gtk4.symbols.gtk_window_set_default_size(window, 800, 600);

        // Run user callback if provided
        f?.(window);

        // Show the window - GTK will handle the main loop
        this.gtk4.symbols.gtk_widget_show(window);
      },
    );

    const activateSignalCStr = new TextEncoder().encode("activate\0");
    const activateSignalPtr = Deno.UnsafePointer.of(activateSignalCStr);
    this.glib.symbols.g_signal_connect_data(
      this.app,
      activateSignalPtr,
      this.activateCallback.pointer,
      null,
      null,
      0,
    );

    // Run the application
    this.glib.symbols.g_application_run(this.app, 0, null);
  }

  [Symbol.dispose]() {
    this.activateCallback?.close();
    this.gtk4.close();
    this.glib.close();
    this.adw.close();
  }
}

if (import.meta.main) {
  using app = new AdwApp({ id: "com.example.example" });
  app.run();
}
