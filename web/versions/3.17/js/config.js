/* Blockvile Plus OS — settings for whoever publishes Blockvile. Edit these, then rebuild the one-file version. */
window.BV_CONFIG = {
  version: "3.17",

  // Raise this number ONLY when a release needs a newer Android app (changes to android/…). Installed apps then send
  // the user to Google Play for that update instead of updating by themselves. Web-only changes never need it.
  nativeApi: 1,

  // Where the Feedback app sends messages. Set ONE of these (or both — the form service is tried first):
  feedback: {
    // A free form service URL, e.g. "https://formspree.io/f/abcdwxyz" (create a form at formspree.io).
    // Feedback is sent straight from the app, no email app needed.
    endpoint: "https://formsubmit.co/ajax/ethanabraham09092014@gmail.com",
    // Or an email address: the Feedback app opens the user's email app with the message filled in.
    email: "ethanabraham09092014@gmail.com",
  },

  // Sign-in, Digital SIM and Blockvile AI run on Supabase (supabase.com, free plan is fine).
  // Paste your project's URL and "anon / publishable" key (Project Settings → API). The anon key is meant to be public.
  // NEVER paste the "service_role" key here. Leave both empty and people can still paste their own in Accounts → Setup.
  supabase: {
    url: "",      // e.g. "https://abcdefghijkl.supabase.co"
    anonKey: "",  // e.g. "eyJhbGciOi..." (anon / publishable key)
    aiFunction: "ai",   // name of the AI Edge Function (see supabase/functions/ai)
  },

  // The public web address of your hosted Blockvile (e.g. "https://yourname.github.io/blockvile-plus-os/").
  // Used when Blockvile is embedded or opened from a file, so "Install" can open the installable version —
  // and it is where the Android app looks for updates (Settings → Software update). Needs the https:// and a final "/".
  installUrl: "",
};
