/* ============================================================================
   data/content.js  –  ALL text and lists for mariam-zeqred.github.io
   ----------------------------------------------------------------------------
   Edit this file to change the site. The HTML pages only contain layout; every
   sentence, project, certificate and photo caption comes from here.

   How to add things (see README.md for the full guide):
   - a certificate: drop the scan into assets/certificates/, run
       python3 scripts/make_images.py
     and add an entry to `certifications` with  image: "name-without-extension".
     Leave `image` out (or null) for a text-only entry.
   - a project: add an entry to `projects`. `publicFrom` is an ISO date; the card
     is hidden until that day (checked in the visitor's browser) so a repository
     that is still private is never linked.
   - a second language later: copy this object into CONTENT.ar and translate.

   Image names refer to img/<name>.jpg (web-sized copies made by the script);
   a name with its own extension (e.g. "telemetry-timeline.png") is used as is.
   `art: "<name>"` points at a drawn illustration img/art/<name>.svg (made by
   scripts/make_art.py) for entries that have no photo yet. The originals stay in assets/.
   ============================================================================ */
window.CONTENT = {
  meta: {
    siteTitle: "Mariam Loutfi – IoT, embedded AI and machine learning",
    description:
      "Mariam Loutfi, Machine Learning Engineer at Lotus Power (Egypt). ESP32/FreeRTOS firmware, IoT systems for agriculture and machine learning on their data. Looking to start a research master's in 2027.",
    url: "https://mariam-zeqred.github.io/",
    ogImage: "img/portrait.jpg",
    lang: "en"
  },

  nav: [
    { id: "about", label: "About" },
    { id: "projects", label: "Projects" },
    { id: "simulations", label: "Simulations" },
    { id: "publications", label: "Publications" },
    { id: "experience", label: "Experience" },
    { id: "education", label: "Education" },
    { id: "certifications", label: "Certifications" },
    { id: "teaching", label: "Teaching" },
    { id: "contact", label: "Contact" }
  ],

  hero: {
    name: "Mariam Loutfi",
    title: "Machine Learning Engineer at Lotus Power · IoT and embedded systems for agriculture",
    location: "Mansoura, Egypt",
    portrait: "portrait",
    portraitAlt: "Studio portrait of Mariam Loutfi",
    primaryButton: { label: "Projects", href: "#projects" },
    secondaryButton: { label: "Simulations", href: "#simulations" },
    facts: [
      "B.Sc. Communication and Computer Engineering, Mansoura University, 2026",
      "GPA 3.95 / 4.0, ranked 9th of 149",
      "One journal paper (2026), one conference paper accepted"
    ]
  },

  about: {
    heading: "About",
    paragraphs: [
      "I build IoT systems for agriculture end to end: ESP32 firmware with real safety layers, cloud telemetry, the mobile apps that run them, and then the machine learning on top of the data they produce.",
      "At Lotus Power, a startup with agriculture, mobility and IoT projects, the team is small, so my role spans embedded firmware, IoT and data analysis. The incubator for honey-bee queens and the poultry-house climate controller on this page are products that have been built and tested on real hardware.",
      "I am looking to start a research master's in 2027 in IoT, embedded AI or smart agriculture. The simulations on this site are there so that visitors can play with the control logic of my projects."
    ],
    goal: "Looking to start a research master's in 2027 in IoT / embedded AI / smart agriculture.",
    skillGroups: [
      { label: "Languages", items: ["Python (advanced)", "C (advanced)", "Embedded C on ESP32 / FreeRTOS", "HTML / CSS / Java (intermediate)"] },
      { label: "Machine learning", items: ["Predictive analysis", "Data analysis", "Anomaly detection on sensor data"] },
      { label: "Cloud and mobile", items: ["AWS (Solutions Architect Associate, Cloud Practitioner)", "Flutter", "Firebase Realtime Database"] },
      { label: "Spoken languages", items: ["Arabic (native)", "English (advanced)", "German (beginner)"] }
    ]
  },

  projects: {
    heading: "Projects",
    intro: "Real product work, described from the public repositories. More repositories are published one at a time; this list is synchronised with GitHub every day, so a repository appears here the day it becomes public.",
    hiddenNote: "More repositories are scheduled to become public over the coming weeks.",
    items: [
      {
        name: "queen-bee-incubator",
        title: "Queen-bee incubator controller",
        repo: "https://github.com/Mariam-zeqred/queen-bee-incubator",
        publicFrom: "2026-01-01",
        image: "incubator-unit",
        imageAlt: "The queen-bee incubator unit: a white steel cabinet with an LCD control head and a window showing the queen-cell rack",
        summary: [
          "IoT incubator controller for rearing honey-bee queens. An ESP32 running five FreeRTOS tasks holds the brood chamber at its target with on/off hysteresis control, an OFF-anticipation term and a heater duty-cycle limit, tuned from a 24-hour thermal test campaign.",
          "An independent 10 Hz safety task enforces a latched 40 °C thermal cutoff, sensor-failure and stale-reading detection, a maximum heater-on time and a door-open actuator cutoff. Every reading is logged to an SD card and to Firebase; firmware updates arrive over the air with a SHA-256 check.",
          "Two Flutter apps: one for the beekeeper (provisioning, live dashboard, history, target temperature; English and Arabic) and one for the engineering team (alarm bursts, device log, OTA push, remote resume)."
        ],
        tags: ["ESP32", "FreeRTOS", "Arduino C++", "Firebase", "Flutter", "OTA", "SD logging"],
        links: [
          { label: "Paper (DOI)", href: "https://doi.org/10.64820/AEPJCSER.31.13.22.62026" }
        ],
        simulation: { label: "Play with the thermal simulation", href: "sim/incubator.html" }
      },
      {
        name: "smart-poultry-farm",
        title: "Smart poultry-farm climate controller",
        repo: "https://github.com/Mariam-zeqred/smart-poultry-farm",
        publicFrom: "2026-01-01",
        image: "poultry-controller-front-1",
        imageAlt: "Front panel of the poultry climate-controller cabinet: LCD, Arabic-labelled A/O/M selector switches and an alarm siren",
        summary: [
          "End-to-end climate controller for a poultry house. An ESP32 reads temperature, humidity and ammonia and drives a fan, an evaporative cooler, a heater and a humidifier with hysteresis rules. Hard safety limits (gas above 450 ppm, temperature outside 10–42 °C, humidity outside 30–85 %) override everything else and raise push alerts.",
          "The cabinet keeps working with no internet: a 16x2 LCD and four buttons give full local control, and control ownership hands itself back to the LCD after 90 s of cloud silence. App-to-device commands travel over a Firebase Server-Sent-Events stream in under 500 ms.",
          "Flutter app (English / Arabic) with live dashboard, actuator toggles, thresholds, push alerts and a vision-AI monitoring tab. Five hardware test rounds with the hardware team. A paper on the system is accepted for conference presentation, 2026."
        ],
        tags: ["ESP32", "FreeRTOS", "MQ135", "AM2302", "Firebase SSE", "Flutter", "OneSignal"],
        gallery: [
          { image: "poultry-controller-installed", caption: "Cabinet mounted on the frame, sensor cable in front" },
          { image: "poultry-controller-cabinet-inside", caption: "Interior: breaker and five contactors with thermal relays on the DIN rail" },
          { image: "poultry-controller-door-wiring", caption: "Inside of the door: relay module, push-buttons and terminal blocks" },
          { image: "poultry-app-ar-dashboard", caption: "App dashboard (Arabic)" },
          { image: "poultry-app-ar-farm_control", caption: "App farm-control screen (Arabic)" },
          { image: "poultry-app-ar-smart_monitoring", caption: "App vision-AI monitoring tab (Arabic)" }
        ],
        links: [],
        simulation: { label: "Play with the climate-controller simulation", href: "sim/poultry.html" }
      },
      {
        name: "Fire-and-Motion-Detection",
        title: "Fire and motion detection",
        repo: "https://github.com/Mariam-zeqred/Fire-and-Motion-Detection",
        art: "fire-motion",            /* drawn illustration (img/art/); replace with image: "..." when a photo exists */
        publicFrom: "2026-01-01",
        summary: [
          "Earlier project (2025): real-time fire and motion detection from a webcam or external camera feed using OpenCV image processing, with an alert path (notification or alarm) and event logging. Python, OpenCV, NumPy; TensorFlow/Keras optional for the fire classifier."
        ],
        tags: ["Python", "OpenCV", "NumPy", "Computer vision"],
        links: []
      },

      /* ---- scheduled repositories: hidden until publicFrom (checked client-side) ---- */
      {
        name: "incubator-telemetry-analysis",
        title: "Incubator telemetry analysis",
        repo: "https://github.com/Mariam-zeqred/incubator-telemetry-analysis",
        image: "telemetry-timeline.png", imageAlt: "Chamber, ambient and setpoint over one day of real incubator telemetry, heater-on periods shaded",
        publicFrom: "2026-10-20",
        summary: ["Analysis of real incubator telemetry: thermal model fit and anomaly detectors."],
        tags: ["Python", "Data analysis", "Anomaly detection"],
        simulation: { label: "Thermal simulation", href: "sim/incubator.html" }
      },
      {
        name: "iot-system-design-handbook",
        title: "IoT system design handbook",
        repo: "https://github.com/Mariam-zeqred/iot-system-design-handbook",
        art: "handbook",
        publicFrom: "2026-10-21",
        summary: ["Course in ten chapters on designing IoT systems."],
        tags: ["Course", "IoT"]
      },
      {
        name: "esp32-mqtt-sensor-node",
        title: "ESP32 MQTT sensor node",
        repo: "https://github.com/Mariam-zeqred/esp32-mqtt-sensor-node",
        art: "esp32",
        publicFrom: "2026-10-22",
        summary: ["An ESP32 sensor node publishing readings over MQTT."],
        tags: ["ESP32", "MQTT"]
      },
      {
        name: "freertos-esp32-patterns",
        title: "FreeRTOS patterns on ESP32",
        repo: "https://github.com/Mariam-zeqred/freertos-esp32-patterns",
        art: "rtos",
        publicFrom: "2026-10-23",
        summary: ["FreeRTOS task and queue patterns on the ESP32."],
        tags: ["ESP32", "FreeRTOS", "C"]
      },
      {
        name: "job-recommender-chatbot",
        title: "Job-recommender chatbot",
        repo: "https://github.com/Mariam-zeqred/job-recommender-chatbot",
        art: "chatbot",
        publicFrom: "2026-10-26",
        summary: ["A chatbot that recommends jobs."],
        tags: ["Python", "Machine learning"]
      },
      {
        name: "poultry-vision-counting",
        title: "Poultry vision counting",
        repo: "https://github.com/Mariam-zeqred/poultry-vision-counting",
        art: "poultry-vision",
        publicFrom: "2026-10-25",
        summary: ["Counting birds in a poultry house from camera images."],
        tags: ["Computer vision", "Python"]
      },
      {
        name: "computer-vision-fundamentals",
        title: "Computer vision fundamentals",
        repo: "https://github.com/Mariam-zeqred/computer-vision-fundamentals",
        art: "cv",
        publicFrom: "2026-10-24",
        summary: ["Course on the fundamentals of computer vision."],
        tags: ["Course", "Computer vision"]
      },
      {
        name: "aws-iot-telemetry-pipeline",
        title: "AWS IoT telemetry pipeline",
        repo: "https://github.com/Mariam-zeqred/aws-iot-telemetry-pipeline",
        art: "aws-pipeline",
        publicFrom: "2026-10-29",
        summary: ["An IoT telemetry pipeline on AWS, defined with the AWS CDK."],
        tags: ["AWS", "CDK", "IoT"]
      },
      {
        name: "tinyml-esp32-anomaly",
        title: "TinyML anomaly detection on ESP32",
        repo: "https://github.com/Mariam-zeqred/tinyml-esp32-anomaly",
        art: "tinyml",
        publicFrom: "2026-10-28",
        summary: ["Anomaly detection running on the ESP32 itself."],
        tags: ["TinyML", "ESP32"]
      },
      {
        name: "aws-architecture-by-example",
        title: "AWS architecture by example",
        repo: "https://github.com/Mariam-zeqred/aws-architecture-by-example",
        art: "aws-arch",
        publicFrom: "2026-10-27",
        summary: ["Course on AWS architecture, built from worked examples."],
        tags: ["Course", "AWS"]
      },
      {
        name: "lora-link-budget",
        title: "LoRa link budget",
        repo: "https://github.com/Mariam-zeqred/lora-link-budget",
        art: "lora",
        publicFrom: "2026-10-30",
        summary: ["Link-budget and range estimation for LoRa links."],
        tags: ["LoRa", "RF"],
        simulation: { label: "Link-budget calculator", href: "sim/lora.html" }
      },
      {
        name: "wifi-rssi-localization",
        title: "Wi-Fi RSSI localisation",
        repo: "https://github.com/Mariam-zeqred/wifi-rssi-localization",
        art: "wifi",
        publicFrom: "2026-10-31",
        summary: ["Indoor localisation from Wi-Fi signal strength."],
        tags: ["Wi-Fi", "Localisation"]
      },
      {
        name: "incubator-thermal-control-sim",
        title: "Incubator thermal-control simulation",
        repo: "https://github.com/Mariam-zeqred/incubator-thermal-control-sim",
        image: "thermal-sim-cold-start.png", imageAlt: "Four heater controllers compared on the fitted plant during a cold start",
        publicFrom: "2026-11-01",
        summary: ["Simulation of the incubator's heating with fitted thermal models and a comparison of heater controllers."],
        tags: ["Python", "Control", "Simulation"],
        simulation: { label: "Thermal simulation", href: "sim/incubator.html" }
      }
    ]
  },

  simulations: {
    heading: "Simulations",
    intro: "Interactive models of my projects, written in plain JavaScript. Each one is a simplified model and says so on its page.",
    items: [
      {
        title: "Queen-bee incubator: thermal control",
        href: "sim/incubator.html",
        image: "incubator-unit",
        text: "The chamber model with the parameters fitted on one real day of telemetry, and the firmware's on/off controller with OFF-anticipation next to a plain thermostat and a PID. Open the door, inject a sensor fault, watch the 40 °C safety latch."
      },
      {
        title: "Poultry house: climate controller",
        href: "sim/poultry.html",
        image: "poultry-controller-front-1",
        text: "A house with N birds, outdoor weather, ammonia build-up, and a controller with the real cabinet's thresholds, safety limits, Auto/Off/Manual selectors and LCD readout. Flip the switches and watch the house respond."
      },
      {
        title: "LoRa link budget and range",
        href: "sim/lora.html",
        art: "lora",
        text: "Path-loss model, spreading factor, bandwidth and fade margin: how far a LoRa sensor node reaches under different assumptions."
      }
    ]
  },

  publications: {
    heading: "Publications",
    items: [
      {
        authors: "M. Loutfi et al.",
        title: "Design and Development of a Smart Incubator for Bee Queens Based on IoT Technology",
        venue: "Journal of Computer Science and Engineering Research 3(1), June 2026",
        doi: "10.64820/AEPJCSER.31.13.22.62026",
        href: "https://doi.org/10.64820/AEPJCSER.31.13.22.62026",
        project: "queen-bee-incubator"
      },
      {
        authors: "M. Loutfi et al.",
        title: "Smart poultry-farm monitoring system",
        venue: "Accepted for conference presentation, 2026",
        note: "Conference details to be added once the programme is published.",
        project: "smart-poultry-farm"
      }
    ]
  },

  experience: {
    heading: "Experience",
    items: [
      {
        role: "Machine Learning Engineer",
        org: "Lotus Power",
        orgUrl: null,
        logo: "lotus-power.png",
        period: "2026 – present",
        place: "Egypt",
        bullets: [
          "Startup with agriculture, mobility and IoT projects; small team, so the role spans embedded firmware, IoT and data analysis.",
          "Queen-bee incubator: ESP32/FreeRTOS firmware, safety layer, cloud logging, two Flutter apps; thermal analysis of the device's telemetry.",
          "Poultry-house climate controller: firmware, cabinet hand-over logic, Flutter app, five hardware test rounds."
        ]
      },
      {
        role: "Machine Learning / IoT Intern",
        org: "Lotus Power",
        orgUrl: null,
        logo: "lotus-power.png",
        period: "2025 – 2026",
        place: "Egypt",
        bullets: [
          "Intelligent bee incubators and energy-use optimisation."
        ]
      }
    ]
  },

  education: {
    heading: "Education",
    items: [
      {
        degree: "B.Sc. Communication and Computer Engineering",
        school: "Mansoura University",
        period: "2020 – 2026",
        details: [
          "GPA 3.95 / 4.0, ranked 9th of 149.",
          "Special Appreciation Certificate from the Dean, 2024."
        ]
      }
    ]
  },

  awards: {
    heading: "Awards",
    items: [
      {
        title: "First place, DevDuel (first edition)",
        issuer: "IEEE Computer Society, Mansoura Student Branch Chapter",
        date: "2024",
        image: "ieee-devduel-first-place-2024"
      },
      {
        title: "Dean's Special Appreciation Certificate",
        issuer: "Faculty of Engineering, Mansoura University",
        date: "2024",
        image: "dean-appreciation-ceremony-2024",
        imageNote: "Photo of the ceremony in the faculty council room; the certificate scan will be added."
      }
    ]
  },

  certifications: {
    heading: "Certifications",
    intro: "Click a certificate to open the scan. Verification codes are given where the issuer provides one.",
    items: [
      {
        title: "AWS Certified Solutions Architect – Associate",
        issuer: "Amazon Web Services",
        date: "Issued 7 Feb 2025 · expires 7 Feb 2028",
        image: "aws-solutions-architect-associate-2025",
        verify: { label: "Validation 8083c75a0f45481e949771b2cd0e42a6", href: "https://aws.amazon.com/verification" }
      },
      {
        title: "AWS Certified Cloud Practitioner",
        issuer: "Amazon Web Services",
        date: "Issued 10 Oct 2024 · expires 7 Feb 2028",
        image: "aws-cloud-practitioner-2024",
        verify: { label: "Validation d3ca4c129a034318bcd9b86ef1e04b89", href: "https://aws.amazon.com/verification" }
      },
      {
        title: "Automotive Embedded Systems, Digital Egypt Youth Program",
        issuer: "National Telecommunication Institute (NTI) / MCIT / EME",
        date: "15 Jul – 4 Oct 2024 · 420 hours · score 95 %",
        image: "nti-automotive-embedded-systems-2024"
      },
      {
        title: "ALX Cloud Computing",
        issuer: "ALX (6-month programme, AWS Academy)",
        date: "14 Feb 2025",
        image: "alx-cloud-computing-2025",
        verify: { label: "intranet.alxswe.com/certificates/hxeM8y6pfN", href: "https://intranet.alxswe.com/certificates/hxeM8y6pfN" }
      },
      {
        title: "ALX Professional Foundations",
        issuer: "ALX (Professional Development Skills for the Digital Age)",
        date: "13 Aug 2024",
        image: "alx-professional-foundations-2024",
        verify: { label: "intranet.alxswe.com/certificates/9nPeypFhT8", href: "https://intranet.alxswe.com/certificates/9nPeypFhT8" }
      },
      {
        title: "Data Science Committee, Intermediate level (certificate of appreciation)",
        issuer: "IEEE Computer Society, Mansoura SBC",
        date: "",
        image: "ieee-cs-data-science-committee-intermediate"
      },
      {
        title: "Head of AI, 2024–25 season",
        issuer: "STARKS student organisation",
        date: "2025",
        image: "starks-head-of-ai-2025"
      },
      {
        title: "Python",
        issuer: "New Horizons",
        date: "2022",
        image: null,  /* scan not supplied yet: set to "new-horizons-python-2022" once added */
        art: "certificate"
      },
      {
        title: "Front End",
        issuer: "New Horizons",
        date: "2019",
        image: null,  /* scan not supplied yet */
        art: "certificate"
      }
    ]
  },

  teaching: {
    heading: "Teaching and leadership",
    roles: [
      {
        title: "Head of AI, STARKS student organisation",
        period: "2024 – 2025",
        text: "Led a team of instructors, mentored 14 members, organised AI contests and workshops."
      },
      {
        title: "AI volunteer, IEEE",
        period: "2023 – 2025",
        text: ""
      }
    ],
    lectures: [
      { when: "2025", what: "STARKS Summer Camp: introduction to AI, Python/NumPy, the maths behind machine learning." },
      { when: "Summer 2024", what: "Three-hour introduction-to-AI lecture to 200 students." },
      { when: "2024", what: "STARKS EXPO: embedded C lecture." },
      { when: "2023", what: "MR Hackathon: dataset-cleaning session." }
    ],
    photos: [
      { image: "teaching-whiteboard", caption: "Lecturing at the whiteboard, code on the projector" },
      { image: "lecture-intro-to-ai-starklab", caption: "“Introduction to AI”, StarkLab 2.0" },
      { image: "speaking-at-podium", caption: "Speaking at a lecture-hall podium" },
      { image: "starks-board-meeting", caption: "STARKS board meeting" },
      { image: "starks-session-group", caption: "STARKS session, group photo" },
      { image: "starks-ai-head-announcement", caption: "STARKS announcement: AI Head" },
      { image: "iti-creativa-group", caption: "At the ITI / Creativa hub" },
      { image: "group-engineering-faculty", caption: "In front of the engineering faculty, Mansoura" }
    ]
  },

  contact: {
    heading: "Contact",
    text: "For supervision, collaboration or hiring questions, email is best.",
    email: "Mariamzeqred@gmail.com",
    github: "https://github.com/Mariam-zeqred",
    linkedin: "https://www.linkedin.com/in/mariam-mohamed-mamdouh-lotfi-6b1a47271",
    location: "Mansoura, Egypt"
  },

  footer: {
    text: "Built with plain HTML/CSS/JS, hosted on GitHub Pages.",
    source: "https://github.com/Mariam-zeqred/Mariam-zeqred.github.io"
  }
};
