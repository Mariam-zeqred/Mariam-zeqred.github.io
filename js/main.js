/* Renders index.html from window.CONTENT (data/content.js). Plain JS, no build step. */
(function () {
  "use strict";
  var C = window.CONTENT;
  var IMG = "img/";        // web-sized copies (<= 1600 px)
  var THUMB = "img/thumb/"; // <= 640 px, used in grids

  // ---------- small helpers ----------
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }
  function file(name) { return /\.[a-z0-9]+$/i.test(name) ? name : name + ".jpg"; } // bare names are JPEGs
  function img(name, alt, opts) {
    opts = opts || {};
    return el("img", { src: (opts.full ? IMG : THUMB) + file(name), alt: alt || "", loading: "lazy", decoding: "async" });
  }
  function art(name, alt) { // drawn illustration from img/art/<name>.svg
    return el("img", { src: IMG + "art/" + name + ".svg", alt: alt || "", loading: "lazy", decoding: "async", class: "art" });
  }
  function media(item, cls) { // photo (with lightbox when cls given), illustration, or a themed placeholder
    if (item.image) return el("div", { class: "card-img" }, [cls ? thumbButton(item.image, item.imageAlt || item.title, cls) : img(item.image, item.imageAlt || "")]);
    if (item.art) return el("div", { class: "card-img" }, [art(item.art, item.imageAlt || "")]);
    return el("div", { class: "card-img placeholder", "aria-hidden": "true", text: "{ }" });
  }
  function head(title) {
    return el("div", { class: "section-head" }, [el("h2", { text: title })]);
  }
  function tagList(tags, cls) {
    return el("ul", { class: "tags" }, (tags || []).map(function (t) { return el("li", { class: "tag " + (cls || ""), text: t }); }));
  }
  function ext(href, label, cls) {
    return el("a", { href: href, target: "_blank", rel: "noopener", class: cls || "", text: label });
  }
  // Live repository data (data/repos.js, refreshed daily by scripts/sync_repos.py).
  var REPOS = window.REPOS || null;
  function repoName(item) {
    var m = /github\.com\/[^\/]+\/([^\/#?]+)/.exec(item.repo || "");
    return item.name || (m && m[1]);
  }
  function isPublic(item) {
    if (REPOS) return !!REPOS[repoName(item)];           // what GitHub actually shows
    if (!item.publicFrom) return true;                   // fallback: the scheduled date
    var d = new Date(item.publicFrom + "T00:00:00");
    return !isNaN(d) && d <= new Date();
  }
  function niceDate(iso) {
    var d = new Date(iso + "T00:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function titleCaseTopic(t) {
    var map = { esp32: "ESP32", iot: "IoT", freertos: "FreeRTOS", aws: "AWS", mqtt: "MQTT", lora: "LoRa", lorawan: "LoRaWAN", tinyml: "TinyML", ml: "ML", rtos: "RTOS", api: "API", sql: "SQL", sqlite: "SQLite", cdk: "CDK", cv: "CV", ai: "AI" };
    return t.split("-").map(function (w) { return map[w] || w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
  }
  function mergeLive(item) {
    var live = REPOS && REPOS[repoName(item)];
    if (!live) return item;
    var p = Object.assign({}, item);
    var placeholder = !p.summary || p.summary.length === 0 || (p.summary.length === 1 && p.summary[0].length < 140);
    if (placeholder && live.intro) p.summary = [live.intro];
    else if (placeholder && live.description) p.summary = [live.description];
    var tags = (p.tags || []).slice();
    (live.topics || []).forEach(function (t) { var n = titleCaseTopic(t); if (tags.map(function (x) { return x.toLowerCase(); }).indexOf(n.toLowerCase()) < 0 && tags.length < 9) tags.push(n); });
    p.tags = tags;
    var meta = [];
    if (live.chapters) meta.push(live.chapters + (live.chapters === 1 ? " chapter" : " chapters") + " so far");
    if (live.language) meta.push(live.language);
    if (live.pushedAt) meta.push("updated " + niceDate(live.pushedAt));
    p.meta = meta.join(" · ");
    return p;
  }
  function autoCards(items) {
    if (!REPOS) return [];
    var known = {}; items.forEach(function (i) { known[repoName(i)] = true; });
    return Object.keys(REPOS).filter(function (n) { return !known[n]; }).map(function (n) {
      var live = REPOS[n];
      return { name: n, title: n.replace(/-/g, " ").replace(/\w/g, function (c) { return c.toUpperCase(); }), repo: live.url,
               art: (live.chapters ? "handbook" : "repo"), summary: [live.intro || live.description || ""], tags: [], _auto: true };
    });
  }

  // ---------- lightbox ----------
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lightbox-img");
  var lbCap = document.getElementById("lightbox-cap");
  function openLightbox(name, caption) {
    lbImg.src = IMG + file(name);
    lbImg.alt = caption || "";
    lbCap.textContent = caption || "";
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    lb.classList.remove("open");
    lbImg.removeAttribute("src");
    document.body.style.overflow = "";
  }
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLightbox(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLightbox(); });
  function thumbButton(name, caption, cls) {
    return el("button", { class: cls || "", type: "button", "aria-label": "Open " + (caption || name), onclick: function () { openLightbox(name, caption); } }, [img(name, caption)]);
  }

  // ---------- nav ----------
  var navLinks = document.getElementById("nav-links");
  C.nav.forEach(function (n) { navLinks.appendChild(el("li", null, [el("a", { href: "#" + n.id, text: n.label })])); });
  var toggle = document.getElementById("nav-toggle");
  toggle.addEventListener("click", function () {
    var open = navLinks.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  navLinks.addEventListener("click", function (e) { if (e.target.tagName === "A") { navLinks.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); } });
  document.getElementById("brand-name").textContent = C.hero.name;
  document.title = C.meta.siteTitle;

  // highlight the section in view
  if ("IntersectionObserver" in window) {
    var links = {};
    navLinks.querySelectorAll("a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.toggle("active", k === en.target.id); });
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    C.nav.forEach(function (n) { var s = document.getElementById(n.id); if (s) io.observe(s); });
  }

  // ---------- hero ----------
  var H = C.hero;
  document.getElementById("hero").appendChild(el("div", { class: "wrap" }, [
    el("div", null, [
      el("h1", { text: H.name }),
      el("p", { class: "title", text: H.title }),
      el("p", { class: "loc", text: H.location }),
      el("ul", { class: "facts" }, H.facts.map(function (f, i) { return el("li", { class: i % 2 ? "blue" : "", text: f }); })),
      el("div", { class: "buttons" }, [
        el("a", { class: "btn btn-primary", href: H.primaryButton.href, text: H.primaryButton.label }),
        el("a", { class: "btn btn-accent", href: H.secondaryButton.href, text: H.secondaryButton.label })
      ])
    ]),
    el("div", { class: "portrait-wrap" }, [
      el("img", { src: IMG + H.portrait + ".jpg", alt: H.portraitAlt, width: "1063", height: "1417", fetchpriority: "high" })
    ])
  ]));

  // ---------- about ----------
  var A = C.about;
  document.getElementById("about").appendChild(el("div", { class: "wrap" }, [
    head(A.heading),
    el("div", { class: "about-grid" }, [
      el("div", null, A.paragraphs.map(function (p) { return el("p", { text: p }); }).concat([el("p", { class: "goal", text: A.goal })])),
      el("div", { class: "skills" }, A.skillGroups.map(function (g) {
        return el("div", null, [el("h3", { text: g.label }), tagList(g.items, g.label === "Spoken languages" ? "yellow" : "")]);
      }))
    ])
  ]));

  // ---------- projects ----------
  var P = C.projects;
  var visible = P.items.filter(isPublic).concat(autoCards(P.items)).map(mergeLive);
  var hiddenCount = P.items.length - P.items.filter(isPublic).length;
  function projectCard(p, i) {
    var wide = i < 2 && p.gallery || (i === 0);
    var body = [
      el("h3", null, [ext(p.repo, p.title)]),
      el("p", { class: "small muted", text: p.name + (p.meta ? " · " + p.meta : "") })
    ];
    (p.summary || []).forEach(function (s) { body.push(el("p", { text: s })); });
    if (p.gallery) {
      body.push(el("div", { class: "gallery" }, p.gallery.map(function (g) { return thumbButton(g.image, g.caption); })));
    }
    body.push(tagList(p.tags));
    var foot = [ext(p.repo, "GitHub repository", "btn btn-outline btn-sm")];
    (p.links || []).forEach(function (l) { foot.push(ext(l.href, l.label, "btn btn-outline btn-sm")); });
    if (p.simulation) foot.push(el("a", { class: "btn btn-accent btn-sm", href: p.simulation.href, text: p.simulation.label }));
    body.push(el("div", { class: "card-foot" }, foot));
    return el("article", { class: "card project-card reveal" + (wide ? " wide" : "") }, [media(p, p.gallery ? "cert-thumb" : null), el("div", { class: "card-body" }, body)]);
  }
  var projWrap = el("div", { class: "wrap" }, [head(P.heading), el("p", { class: "intro", text: P.intro })]);
  projWrap.appendChild(el("div", { class: "cards" }, visible.map(projectCard)));
  if (hiddenCount > 0) projWrap.appendChild(el("p", { class: "small muted", style: "margin-top:14px", text: P.hiddenNote + " (" + hiddenCount + " scheduled)" }));
  if (window.REPOS_UPDATED) projWrap.appendChild(el("p", { class: "small muted", text: "Project list synchronised with GitHub on " + niceDate(window.REPOS_UPDATED) + "." }));
  document.getElementById("projects").appendChild(projWrap);

  // ---------- simulations ----------
  var S = C.simulations;
  document.getElementById("simulations").appendChild(el("div", { class: "wrap" }, [
    head(S.heading), el("p", { class: "intro", text: S.intro }),
    el("div", { class: "cards three" }, S.items.map(function (s) {
      return el("article", { class: "card reveal" }, [
        media(s),
        el("div", { class: "card-body" }, [
          el("h3", null, [el("a", { href: s.href, text: s.title })]),
          el("p", { text: s.text }),
          el("div", { class: "card-foot" }, [el("a", { class: "btn btn-primary btn-sm", href: s.href, text: "Open the simulation" })])
        ])
      ]);
    }))
  ]));

  // ---------- publications ----------
  var PU = C.publications;
  document.getElementById("publications").appendChild(el("div", { class: "wrap" }, [head(PU.heading)].concat(PU.items.map(function (p) {
    return el("div", { class: "pub" }, [
      el("div", { class: "title", text: p.title }),
      el("div", null, [p.authors + ". ", el("span", { class: "venue", text: p.venue })]),
      p.doi ? el("div", null, ["DOI: ", ext(p.href, p.doi)]) : null,
      p.note ? el("div", { class: "small muted", text: p.note }) : null
    ]);
  }))));

  // ---------- experience ----------
  var E = C.experience;
  document.getElementById("experience").appendChild(el("div", { class: "wrap" }, [
    head(E.heading),
    el("ul", { class: "timeline" }, E.items.map(function (x) {
      return el("li", null, [
        el("div", { class: "logo" }, [x.logo ? el("img", { src: IMG + x.logo, alt: x.org + " logo", loading: "lazy", width: "56", height: "56" }) : null]),
        el("div", null, [
          el("h3", { text: x.role + " · " + x.org }),
          el("div", { class: "meta", text: x.period + " · " + x.place }),
          el("ul", null, x.bullets.map(function (b) { return el("li", { text: b }); }))
        ])
      ]);
    }))
  ]));

  // ---------- education + awards ----------
  var ED = C.education, AW = C.awards;
  document.getElementById("education").appendChild(el("div", { class: "wrap" }, [
    head(ED.heading),
    el("ul", { class: "timeline" }, ED.items.map(function (x) {
      return el("li", null, [
        el("div", { class: "logo dot", text: "B.Sc." }),
        el("div", null, [
          el("h3", { text: x.degree }),
          el("div", { class: "meta", text: x.school + " · " + x.period }),
          el("ul", null, x.details.map(function (b) { return el("li", { text: b }); }))
        ])
      ]);
    })),
    el("h3", { style: "margin-top:28px", text: AW.heading }),
    el("div", { class: "cert-grid" }, AW.items.map(function (a) {
      return el("div", { class: "cert" }, [
        a.image ? thumbButton(a.image, a.title, "cert-thumb") : el("div", { class: "cert-thumb none", text: "Scan to be added" }),
        el("div", { class: "cert-body" }, [
          el("strong", { text: a.title }),
          el("span", { text: a.issuer }),
          el("span", { class: "small muted", text: a.date }),
          a.imageNote ? el("span", { class: "small muted", text: a.imageNote }) : null
        ])
      ]);
    }))
  ]));

  // ---------- certifications ----------
  var CE = C.certifications;
  document.getElementById("certifications").appendChild(el("div", { class: "wrap" }, [
    head(CE.heading), el("p", { class: "intro", text: CE.intro }),
    el("div", { class: "cert-grid" }, CE.items.map(function (c) {
      return el("div", { class: "cert" }, [
        c.image ? thumbButton(c.image, c.title + " – " + c.issuer, "cert-thumb") : (c.art ? el("div", { class: "cert-thumb none" }, [art(c.art, "Scan to be added")]) : el("div", { class: "cert-thumb none", text: "Scan to be added" })),
        el("div", { class: "cert-body" }, [
          el("strong", { text: c.title }),
          el("span", { text: c.issuer }),
          c.date ? el("span", { class: "small muted", text: c.date }) : null,
          c.verify ? el("span", { class: "verify" }, [ext(c.verify.href, c.verify.label)]) : null
        ])
      ]);
    }))
  ]));

  // ---------- teaching & leadership ----------
  var T = C.teaching;
  document.getElementById("teaching").appendChild(el("div", { class: "wrap" }, [
    head(T.heading),
    el("div", { class: "two-col" }, [
      el("div", null, [el("h3", { text: "Roles" })].concat(T.roles.map(function (r) {
        return el("p", null, [el("strong", { text: r.title }), " (" + r.period + ")", r.text ? ". " + r.text : ""]);
      }))),
      el("div", null, [
        el("h3", { text: "Lectures and sessions" }),
        el("ul", { class: "lectures" }, T.lectures.map(function (l) { return el("li", null, [el("span", { class: "when", text: l.when }), el("span", { text: l.what })]); }))
      ])
    ]),
    el("div", { class: "strip" }, T.photos.map(function (p) {
      return el("figure", null, [thumbButton(p.image, p.caption), el("figcaption", { text: p.caption })]);
    }))
  ]));

  // ---------- contact ----------
  var CO = C.contact;
  document.getElementById("contact").appendChild(el("div", { class: "wrap" }, [
    el("div", { class: "contact-box" }, [
      el("h2", { text: CO.heading }),
      el("p", { text: CO.text, style: "margin:0" }),
      el("div", { class: "contact-links" }, [
        el("a", { href: "mailto:" + CO.email, text: CO.email }),
        ext(CO.github, "github.com/Mariam-zeqred"),
        CO.linkedin ? ext(CO.linkedin, "LinkedIn") : null
      ]),
      el("div", { class: "small", text: CO.location })
    ])
  ]));

  // ---------- reveal on scroll ----------
  document.querySelectorAll(".section-head, .pub, .timeline > li, .cert, .strip figure, .contact-box, .about-grid > *").forEach(function (n) { n.classList.add("reveal"); });
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !reduce) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".reveal").forEach(function (n, i) { n.style.transitionDelay = (i % 6) * 60 + "ms"; ro.observe(n); });
    setTimeout(function () { document.querySelectorAll(".reveal:not(.in)").forEach(function (n) { n.classList.add("in"); }); }, 2500); // safety net: never leave content hidden
  } else document.querySelectorAll(".reveal").forEach(function (n) { n.classList.add("in"); });

  // ---------- footer ----------
  document.getElementById("footer").appendChild(el("div", { class: "wrap" }, [
    el("span", { text: C.footer.text + " " }), ext(C.footer.source, "Source"), el("span", { text: " · © " + new Date().getFullYear() + " " + H.name })
  ]));
})();
