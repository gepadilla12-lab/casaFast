const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webmanifest": "application/manifest+json",
};

http.createServer((req, res) => {
  if (req.url.startsWith("/api") || req.url.startsWith("/uploads")) {
    const url = new URL(req.url, "http://127.0.0.1:5000");
    const proxy = http.request(
      {
        hostname: "127.0.0.1",
        port: 5000,
        path: url.pathname + url.search,
        method: req.method,
        headers: req.headers,
      },
      (upstream) => {
        res.writeHead(upstream.statusCode || 500, upstream.headers);
        upstream.pipe(res);
      }
    );
    proxy.on("error", () => {
      res.writeHead(502);
      res.end("Backend no disponible");
    });
    req.pipe(proxy);
    return;
  }

  let file = path.join(
    root,
    decodeURIComponent(
      req.url.split("?")[0] === "/"
        ? "index.html"
        : req.url.split("?")[0].replace(/^\//, "")
    )
  );
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(root, "index.html");
  }

  res.writeHead(200, {
    "Content-Type": types[path.extname(file)] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  fs.createReadStream(file).pipe(res);
}).listen(5173, "0.0.0.0", () => {
  console.log("CASAFAST disponible en http://127.0.0.1:5173");
});
