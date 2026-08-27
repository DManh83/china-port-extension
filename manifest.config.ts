import { defineManifest } from "@crxjs/vite-plugin"

export default defineManifest({
    manifest_version: 3,

    name: "China Ports Extension",

    version: "1.0.0",

    permissions: ["storage", "activeTab"],

    action: {
        default_popup: "index.html",
        default_icon: {
            "32": "public/icons/icon.png",
        },
    },

    background: {
        service_worker: "src/background/background.ts",
    },

    content_scripts: [
        {
            matches: ["<all_urls>"],
            js: ["src/content/content.ts"],
        },
    ],
})
