/* Blockvile Plus OS — settings for whoever publishes Blockvile. Edit these, then rebuild the one-file version. */
window.BV_CONFIG = {
  version: "3.5",

  // Where the Feedback app sends messages. Set ONE of these (or both — the form service is tried first):
  feedback: {
    // A free form service URL, e.g. "https://formspree.io/f/abcdwxyz" (create a form at formspree.io).
    // Feedback is sent straight from the app, no email app needed.
    endpoint: "",
    // Or an email address: the Feedback app opens the user's email app with the message filled in.
    email: "",
  },

  // The public web address of your hosted Blockvile (e.g. "https://yourname.github.io/blockvile-plus-os/").
  // Used when Blockvile is embedded or opened from a file, so "Install" can open the installable version.
  installUrl: "",
};
