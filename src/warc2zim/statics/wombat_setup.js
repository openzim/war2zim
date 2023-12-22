// This file setup a wbinfo dictionnary to configure a wombat instance.
// It mainly export one function `getWombatInfo` which takes context information
// and returns a configuration dictionnary to pass to wombat.

const getWombatInfo = (function () {
  // Reduce "complex" url to our simplyfied ones.
  // ! MUST be in sync with the python code (at zim creation time)
  let reduce = function (path) {
    const fuzzy_rules = [
      {
        match: new RegExp(
          ".*googlevideo.com/(videoplayback\\?).*((?<=[?&])id=[^&]+).*",
        ),
        replace: "youtube.fuzzy.replayweb.page/$1$2",
      },
      {
        match: new RegExp(
          "(?:www\\.)?youtube(?:-nocookie)?\\.com/(get_video_info\\?).*(video_id=[^&]+).*",
        ),
        replace: "youtube.fuzzy.replayweb.page/$1$2",
      },
      {
        match: new RegExp("(\\.[^?]+\\?)[\\d]+$"),
        replace: "$1",
      },
      {
        match: new RegExp(
          "(?:www\\.)?youtube(?:-nocookie)?\\.com\\/(youtubei/[^?]+).*(videoId[^&]+).*",
        ),
        replace: "youtube.fuzzy.replayweb.page/$1?$2",
      },
      {
        match: new RegExp(
          "(?:www\\.)?youtube(?:-nocookie)?\\.com/embed/([^?]+).*",
        ),
        replace: "youtube.fuzzy.replayweb.page/embed/$1",
      },
      {
        match: new RegExp("youtube.fuzzy.replayweb.page/embed/([^?&]+).*"),
        replace: "youtube.fuzzy.replayweb.page/embed/$1",
      },
      {
        match: new RegExp(
          ".*(?:gcs-vimeo|vod|vod-progressive)\\.akamaized\\.net.*?/([\\d/]+.mp4)$",
        ),
        replace: "vimeo-cdn.fuzzy.replayweb.page/$1",
      },
      {
        match: new RegExp(".*player.vimeo.com/(video/[\\d]+)\\?.*"),
        replace: "vimeo.fuzzy.replayweb.page/$1",
      },
    ];

    for (const rule of fuzzy_rules) {
      const new_path = path.replace(rule.match, rule.replace);
      if (new_path != path) {
        return new_path;
      }
    }
    return path;
  };

  return function (
    current_url, // The current (real) url we are on
    orig_host, // The host of the original url
    orig_scheme, // The scheme of the original url
    orig_url, // The original url
    prefix, // The (absolute) prefix to add to all our urls (from where we are served)
  ) {
    const urlRewriteFunction = function (url, useRel, mod, doc) {
      if (!url) return url;

      url = url.toString();

      if (url.startsWith(orig_host)) return url;

      for (const prefix of [
        "#",
        "about:",
        "data:",
        "blob:",
        "mailto:",
        "javascript:",
        "{",
        "*",
      ]) {
        if (url.startsWith(prefix)) {
          return url;
        }
      }

      var absolute_url;
      if (url.startsWith("//")) {
        absolute_url = orig_scheme + url;
      } else if (url.startsWith("/")) {
        // We have a absolute path without host.
        // So it is a absolute path relative to the original host.
        absolute_url = new URL(url, orig_url).toString();
      } else {
        // Relative path or full url.
        // Let's build relative to our current url (`URL` will take care of relative vs full url)
        absolute_url = new URL(url, current_url).toString();
      }

      var entry_path;
      if (absolute_url.startsWith(prefix)) {
        // The absolute_url start with our prefix.
        // It means that `url` was a relative or already processed url.
        // We can simply remove our prefix to found our entry's path.
        entry_path = absolute_url.substring(prefix.length);
      } else {
        // Remove potential scheme.
        entry_path = absolute_url.replace(/^\w+:?\/\//i, "");
      }

      // Now we have a entry's path "as seen by the website".
      // We need to reduce it to what we have stored in the zim file.
      const reduced_path = reduce(entry_path);

      var final_url = prefix + reduced_path;

      final_url = new URL(final_url);
      if (final_url.search) {
        final_url.pathname =
          final_url.pathname + encodeURIComponent(final_url.search);
        final_url.search = "";
      }

      return final_url.toString();
    };

    const wbinfo = {
      // The rewrite function used to rewrite our urls.
      rewrite_function: urlRewriteFunction,

      // Seems to be used only to send message to. We don't care ?
      top_url: current_url,

      // Seems to be used to generate url for blobUrl returned by SW.
      // We don't care (?)
      url: orig_url,

      // Use to timestamp message send to top frame. Don't care
      timestamp: "",

      // Use to send message to top frame and in default rewrite url function. Don't care
      request_ts: "",

      // The url on which we are served.
      prefix: prefix,

      // The default mod to use.
      mod: "",

      // Use to detect if we are framed (and send message to top frame ?)
      is_framed: false,

      // ??
      is_live: false,

      // Never used ?
      coll: "",

      // Set wombat if is proxy mode (we are not)
      proxy_magic: "",

      // This is the prefix on which we have stored our static files (needed by wombat).
      // Must not conflict with other url served.
      // Will be used by wombat to not rewrite back the url
      static_prefix: prefix + "_zim_static/",

      wombat_ts: "",

      // A delay is sec to apply to all js time (`Date.now()`, ...)
      wombat_sec: 0,

      // The scheme of the original url
      wombat_scheme: orig_scheme,

      // The host of the original url
      wombat_host: orig_host,

      // Extra options ?
      wombat_opts: {},

      // ?
      enable_auto_fetch: true,
      convert_post_to_get: true,
      target_frame: "___wb_replay_top_frame",
      isSW: true,
    };

    return wbinfo;
  };
})();
