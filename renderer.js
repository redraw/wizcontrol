new Vue({
  el: "#app",

  data() {
    return {
      params: {
        color: { r: 255, g: 255, b: 255 },
        brightness: 0,
        temp: 0,
        rssi: -80,
      },
      loading: true,
      pane: null,
    };
  },

  mounted() {
    window.electron.send("discover");
    this.pane = new Tweakpane.Pane({
      container: document.getElementById("controls"),
      // expanded: true,
    });

    this.pane.addButton({ title: "ON" }).on("click", this.turnOn);
    this.pane.addButton({ title: "OFF" }).on("click", this.turnOff);
    this.pane.addInput(this.params, "brightness", { step: 1, min: 10, max: 100 });
    this.pane.addInput(this.params, "temp", {
      label: "temp (K)",
      step: 10,
      min: 2200,
      max: 6500,
    });
    this.pane.addInput(this.params, "color", {
      step: 1,
      picker: "inline",
      expanded: true,
    });
    this.pane.addMonitor(this.params, "rssi", {view: "graph", min: -90, max: -20});
    this.pane.on("change", this.onInputChange);

    window.electron.on("status", (lights) => {
      this.loading = false;
      const state = lights[Object.keys(lights)[0]];
      if (state.rssi) {
        this.params.rssi = state.rssi;
      }
      if (state.dimming) {
        this.params.brightness = state.dimming;
      }
      if (state.temp) {
        this.params.temp = state.temp;
      }
      if (state.r && state.g && state.b) {
        this.params = { ...this.params, r: state.r, g: state.g, b: state.b };
      }
      this.pane.importPreset(this.params);
    });
    setTimeout(this.getStatus, 500);
  },

  methods: {
    discover() {
      window.electron.send("discover");
    },
    turnOn() {
      window.electron.send("turnOn");
      setTimeout(this.getStatus, 500);
    },
    turnOff() {
      window.electron.send("turnOff");
      setTimeout(this.getStatus, 500);
    },
    setBrightness(value) {
      window.electron.send("setBrightness", value);
      setTimeout(this.getStatus, 500);
    },
    setTemp(value) {
      window.electron.send("setTemp", value);
      setTimeout(this.getStatus, 500);
    },
    setColor(value) {
      window.electron.send("setColor", value);
      setTimeout(this.getStatus, 500);
    },
    getStatus() {
      this.loading = true;
      window.electron.send("getStatus");
    },
    select(ip) {
      this.selected = ip;
    },
    onInputChange(ev) {
      if (ev.last) {
        switch (ev.presetKey) {
          case "brightness":
            this.setBrightness(ev.value);
            break;
          case "temp":
            this.setTemp(ev.value);
            break;
          case "color":
            const { r, g, b } = ev.value;
            this.setColor({ r: parseInt(r), g: parseInt(g), b: parseInt(b) });
            break;
        }
      }
    },
  },
});
