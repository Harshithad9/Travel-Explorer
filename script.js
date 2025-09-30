const UNSPLASH_ACCESS_KEY = "Lh5mCwISgSXAEtQduQtYAoIgilMJOg-N_P4WEZqsVC4"
const OPENWEATHER_API_KEY = "b98d90a5ba06d4845afbe534f4be3a57"

// DOM Elements
const placeInput = document.getElementById("placeInput")
const searchBtn = document.getElementById("searchBtn")
const popularList = document.querySelector(".popular-list")
const statusEl = document.getElementById("status")
const loadingEl = document.getElementById("loading")
const galleryEl = document.getElementById("gallery")
const weatherEl = document.getElementById("weather")
const mapEl = document.getElementById("map")
const themeToggle = document.getElementById("themeToggle")

const navWelcome = document.getElementById("navWelcome")
const navExplore = document.getElementById("navExplore")
const navFavorites = document.getElementById("navFavorites")
const navPlanner = document.getElementById("navPlanner")
const startExploringBtn = document.getElementById("startExploringBtn")

const sectionWelcome = document.getElementById("welcome")
const sectionExplore = document.getElementById("explore")
const sectionFavorites = document.getElementById("favorites")
const sectionPlanner = document.getElementById("planner")

const recentList = document.getElementById("recentList")
const favoritesGrid = document.getElementById("favoritesGrid")
const favoritesEmpty = document.getElementById("favoritesEmpty")

const plannerPlaceEl = document.getElementById("plannerPlace")
const plannerForm = document.getElementById("plannerForm")
const itemTitle = document.getElementById("itemTitle")
const itemDate = document.getElementById("itemDate")
const itemNote = document.getElementById("itemNote")
const itineraryList = document.getElementById("itineraryList")
const itineraryEmpty = document.getElementById("itineraryEmpty")
const exportPlanBtn = document.getElementById("exportPlanBtn")

const lightbox = document.getElementById("lightbox")
const lightboxImg = document.getElementById("lightboxImg")
const lightboxCaption = document.getElementById("lightboxCaption")
const lightboxClose = document.getElementById("lightboxClose")
const lightboxPrev = document.getElementById("lightboxPrev")
const lightboxNext = document.getElementById("lightboxNext")

// Storage keys
const STORAGE_LAST_CITY = "travel_explorer_last_city"
const STORAGE_THEME = "travel_explorer_theme"
const STORAGE_RECENT = "travel_explorer_recent"
const STORAGE_FAVORITES = "travel_explorer_favorites"
const STORAGE_ITINERARIES = "travel_explorer_itineraries"

let currentPhotoList = []
let currentPhotoIndex = 0

// Init
document.addEventListener("DOMContentLoaded", () => {
  // Theme
  const savedTheme = localStorage.getItem(STORAGE_THEME)
  if (savedTheme === "dark") {
    setTheme("dark")
  } else {
    setTheme("light")
  }

  // Views: open welcome if no last city, else explore
  const last = localStorage.getItem(STORAGE_LAST_CITY)
  renderRecent()
  renderFavorites()
  if (last) {
    placeInput.value = last
    setView("explore")
    handleSearch(last)
  } else {
    setView("welcome")
  }
})
;[navWelcome, navExplore, navFavorites, navPlanner].forEach((btn) => {
  btn?.addEventListener("click", () => setView(btn.dataset.view))
})
startExploringBtn?.addEventListener("click", () => setView("explore"))

function setView(view) {
  const views = {
    welcome: sectionWelcome,
    explore: sectionExplore,
    favorites: sectionFavorites,
    planner: sectionPlanner,
  }
  Object.entries(views).forEach(([key, el]) => {
    if (!el) return
    el.hidden = key !== view
  })

  // aria-current state on nav
  ;[navWelcome, navExplore, navFavorites, navPlanner].forEach((btn) => {
    if (!btn) return
    btn.setAttribute("aria-current", btn.dataset.view === view ? "page" : "false")
  })
}

// Event listeners
searchBtn.addEventListener("click", () => {
  const q = placeInput.value.trim()
  if (q) handleSearch(q)
})

placeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const q = placeInput.value.trim()
    if (q) handleSearch(q)
  }
})

popularList.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-place]")
  if (!btn) return
  const q = btn.getAttribute("data-place")
  placeInput.value = q
  handleSearch(q)
})

themeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark"
  setTheme(isDark ? "light" : "dark")
})

plannerForm?.addEventListener("submit", (e) => {
  e.preventDefault()
  const place = localStorage.getItem(STORAGE_LAST_CITY)
  if (!place) {
    showStatus("Search a destination first to plan for it.", "error")
    return
  }
  if (!itemTitle.value.trim()) return

  const plan = loadItinerary()
  const list = plan[place] || []
  list.push({
    id: cryptoRandomId(),
    title: itemTitle.value.trim(),
    date: itemDate.value || "",
    note: itemNote.value.trim(),
    createdAt: Date.now(),
  })
  plan[place] = list
  saveItinerary(plan)
  itemTitle.value = ""
  itemDate.value = ""
  itemNote.value = ""
  renderItinerary(place)
})

exportPlanBtn?.addEventListener("click", () => {
  const place = localStorage.getItem(STORAGE_LAST_CITY) || "Trip"
  const plan = loadItinerary()[place] || []
  const data = JSON.stringify({ place, items: plan }, null, 2)
  navigator.clipboard?.writeText(data).then(
    () => showStatus("Planner exported to clipboard.", "info"),
    () => showStatus("Could not copy. Select and copy manually.", "error"),
  )
})

// Helpers
function setTheme(mode) {
  document.documentElement.setAttribute("data-theme", mode)
  const dark = mode === "dark"
  themeToggle.setAttribute("aria-pressed", String(dark))
  themeToggle.textContent = dark ? "☀️ Light Mode" : "🌙 Dark Mode"
  localStorage.setItem(STORAGE_THEME, mode)
}

function setLoading(isLoading) {
  loadingEl.hidden = !isLoading
  if (isLoading) {
    showStatus("Fetching photos and weather...")
    renderSkeletons(9) // skeleton placeholders for gallery
  } else {
    showStatus("")
  }
}

function showStatus(message, type = "info") {
  statusEl.textContent = message
  statusEl.classList.toggle("status--error", type === "error")
}

function saveLast(place) {
  localStorage.setItem(STORAGE_LAST_CITY, place)
  plannerPlaceEl.textContent = place
}

function clearResults() {
  galleryEl.innerHTML = ""
  weatherEl.innerHTML = ""
}

function renderSkeletons(n = 6) {
  galleryEl.innerHTML = ""
  const frag = document.createDocumentFragment()
  for (let i = 0; i < n; i++) {
    const ph = document.createElement("div")
    ph.className = "skeleton"
    frag.appendChild(ph)
  }
  galleryEl.appendChild(frag)
}

function updateMap(place) {
  // No API key required: simple embed query
  const src = `https://www.google.com/maps?q=${encodeURIComponent(place)}&output=embed`
  mapEl.setAttribute("src", src)
}

// Fetchers
async function fetchPhotos(place) {
  const url = new URL("https://api.unsplash.com/search/photos")
  url.searchParams.set("query", place)
  url.searchParams.set("per_page", "9")
  url.searchParams.set("orientation", "landscape")
  url.searchParams.set("client_id", UNSPLASH_ACCESS_KEY)

  const res = await fetch(url.toString())
  if (!res.ok) {
    // Unsplash often uses 403 for rate limits or invalid key
    const text = await res.text().catch(() => "")
    throw new Error(`Photos error: ${res.status} ${text}`.trim())
  }
  const data = await res.json()
  return data.results || []
}

async function fetchWeather(place) {
  const url = new URL("https://api.openweathermap.org/data/2.5/weather")
  url.searchParams.set("q", place)
  url.searchParams.set("appid", OPENWEATHER_API_KEY)
  url.searchParams.set("units", "metric")

  const res = await fetch(url.toString())
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("City not found.")
    }
    const text = await res.text().catch(() => "")
    throw new Error(`Weather error: ${res.status} ${text}`.trim())
  }
  return res.json()
}

function addRecent(term) {
  const list = loadRecent()
  const existingIdx = list.findIndex((t) => t.toLowerCase() === term.toLowerCase())
  if (existingIdx !== -1) list.splice(existingIdx, 1)
  list.unshift(term)
  const trimmed = list.slice(0, 8)
  localStorage.setItem(STORAGE_RECENT, JSON.stringify(trimmed))
  renderRecent()
}
function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_RECENT) || "[]")
  } catch {
    return []
  }
}
function renderRecent() {
  if (!recentList) return
  const items = loadRecent()
  recentList.innerHTML = ""
  items.forEach((term) => {
    const b = document.createElement("button")
    b.className = "chip"
    b.textContent = term
    b.addEventListener("click", () => {
      placeInput.value = term
      setView("explore")
      handleSearch(term)
    })
    recentList.appendChild(b)
  })
}

function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_FAVORITES) || "[]")
  } catch {
    return []
  }
}
function saveFavorites(list) {
  localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(list))
}
function isFavorited(id) {
  return loadFavorites().some((f) => f.id === id)
}
function toggleFavorite(photo) {
  const list = loadFavorites()
  const idx = list.findIndex((f) => f.id === photo.id)
  if (idx !== -1) {
    list.splice(idx, 1)
  } else {
    list.push(photo)
  }
  saveFavorites(list)
  renderFavorites()
}
function renderFavorites() {
  const list = loadFavorites()
  favoritesGrid.innerHTML = ""
  favoritesEmpty.hidden = list.length > 0
  list.forEach((p) => {
    const fig = document.createElement("figure")
    fig.className = "card"
    const img = document.createElement("img")
    img.src = p.thumb
    img.alt = p.alt || `Favorite from ${p.place}`
    img.loading = "lazy"
    fig.appendChild(img)

    const remove = document.createElement("button")
    remove.className = "fav-btn active"
    remove.title = "Remove from favorites"
    remove.setAttribute("aria-label", "Remove from favorites")
    remove.textContent = "♥"
    remove.addEventListener("click", () => toggleFavorite(p))
    fig.appendChild(remove)

    favoritesGrid.appendChild(fig)
  })
}

// Renderers
function renderPhotos(photos, place) {
  galleryEl.innerHTML = ""

  if (!photos.length) {
    const p = document.createElement("p")
    p.textContent = "No photos found."
    galleryEl.appendChild(p)
    return
  }

  currentPhotoList = photos.map((p) => ({
    id: p.id,
    thumb: p.urls?.small || p.urls?.regular || p.urls?.thumb,
    full: p.urls?.regular || p.urls?.full || p.urls?.small,
    alt: p.alt_description ? `${p.alt_description} - ${place}` : `Photo of ${place}`,
    place,
    author: p.user?.name || "Unknown",
  }))

  const frag = document.createDocumentFragment()

  currentPhotoList.forEach((pic, idx) => {
    if (!pic.thumb) return

    const card = document.createElement("figure")
    card.className = "card"

    const img = document.createElement("img")
    img.src = pic.thumb
    img.alt = pic.alt
    img.loading = "lazy"
    img.addEventListener("click", () => openLightbox(idx))
    card.appendChild(img)

    const fav = document.createElement("button")
    fav.className = "fav-btn" + (isFavorited(pic.id) ? " active" : "")
    fav.title = isFavorited(pic.id) ? "Remove from favorites" : "Add to favorites"
    fav.setAttribute("aria-label", fav.title)
    fav.textContent = isFavorited(pic.id) ? "♥" : "♡"
    fav.addEventListener("click", (e) => {
      e.stopPropagation()
      toggleFavorite(pic)
      // reflect UI immediately
      fav.classList.toggle("active")
      fav.textContent = isFavorited(pic.id) ? "♥" : "♡"
      fav.title = isFavorited(pic.id) ? "Remove from favorites" : "Add to favorites"
      fav.setAttribute("aria-label", fav.title)
    })
    card.appendChild(fav)

    frag.appendChild(card)
  })

  galleryEl.appendChild(frag)
}

function renderWeather(data) {
  weatherEl.innerHTML = ""

  if (!data || !data.weather || !data.weather.length) {
    const p = document.createElement("p")
    p.textContent = "No weather data available."
    weatherEl.appendChild(p)
    return
  }

  const name = data.name
  const temp = Math.round(data.main?.temp ?? 0)
  const humidity = data.main?.humidity
  const wind = data.wind?.speed
  const condition = data.weather[0]?.main || "N/A"
  const description = data.weather[0]?.description || ""

  const container = document.createElement("div")
  container.innerHTML = `
    <div class="weather-top">
      <div>
        <div class="temp" aria-label="Temperature">${temp}°C</div>
        <div aria-label="Location">${name}</div>
      </div>
      <span class="badge" aria-label="Condition">${condition}</span>
    </div>
    <div>
      <div aria-label="Details">${description ? description.charAt(0).toUpperCase() + description.slice(1) : ""}</div>
      <div>Humidity: <strong>${humidity ?? "–"}%</strong></div>
      <div>Wind: <strong>${wind ?? "–"} m/s</strong></div>
    </div>
  `

  weatherEl.appendChild(container)
}

// Controller
async function handleSearch(place) {
  clearResults()
  setLoading(true)
  showStatus("")

  saveLast(place)
  plannerPlaceEl.textContent = place
  updateMap(place)

  try {
    const [photos, weather] = await Promise.allSettled([fetchPhotos(place), fetchWeather(place)])

    if (photos.status === "fulfilled") {
      renderPhotos(photos.value, place)
      addRecent(place) // update recent on successful photos fetch
    } else {
      console.warn(photos.reason)
      renderPhotos([], place)
      showStatus(friendlyUnsplashError(photos.reason), "error")
    }

    if (weather.status === "fulfilled") {
      renderWeather(weather.value)
    } else {
      console.warn(weather.reason)
      renderWeather(null)
      const msg = /City not found/i.test(String(weather.reason?.message || ""))
        ? "No results found. Please check the city name."
        : "We couldn't fetch weather right now. Please try again later."
      showStatus(msg, "error")
    }

    if (photos.status === "rejected" && weather.status === "rejected") {
      showStatus("No results found or API limit exceeded. Try a different place or later.", "error")
    }
  } finally {
    setLoading(false)
  }

  setView("explore")
}

function openLightbox(index) {
  if (!currentPhotoList.length) return
  currentPhotoIndex = index
  showLightboxIndex(currentPhotoIndex)
  lightbox.hidden = false
  lightboxClose.focus()
  document.addEventListener("keydown", onLightboxKey)
}
function closeLightbox() {
  lightbox.hidden = true
  document.removeEventListener("keydown", onLightboxKey)
}
function onLightboxKey(e) {
  if (e.key === "Escape") closeLightbox()
  if (e.key === "ArrowRight") showLightboxIndex(currentPhotoIndex + 1)
  if (e.key === "ArrowLeft") showLightboxIndex(currentPhotoIndex - 1)
}
function showLightboxIndex(nextIndex) {
  if (!currentPhotoList.length) return
  if (nextIndex < 0) nextIndex = currentPhotoList.length - 1
  if (nextIndex >= currentPhotoList.length) nextIndex = 0
  currentPhotoIndex = nextIndex
  const pic = currentPhotoList[currentPhotoIndex]
  lightboxImg.src = pic.full
  lightboxImg.alt = pic.alt
  lightboxCaption.textContent = `${pic.place} — Photo by ${pic.author}`
}
lightboxClose?.addEventListener("click", closeLightbox)
lightboxPrev?.addEventListener("click", () => showLightboxIndex(currentPhotoIndex - 1))
lightboxNext?.addEventListener("click", () => showLightboxIndex(currentPhotoIndex + 1))

function loadItinerary() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_ITINERARIES) || "{}")
  } catch {
    return {}
  }
}
function saveItinerary(obj) {
  localStorage.setItem(STORAGE_ITINERARIES, JSON.stringify(obj))
}
function renderItinerary(place) {
  plannerPlaceEl.textContent = place || "—"
  const plan = loadItinerary()
  const list = place ? plan[place] || [] : []
  itineraryList.innerHTML = ""
  itineraryEmpty.hidden = list.length > 0

  list
    .slice()
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || a.createdAt - b.createdAt)
    .forEach((item) => {
      const li = document.createElement("li")

      const info = document.createElement("div")
      const title = document.createElement("div")
      title.textContent = item.title
      const meta = document.createElement("div")
      meta.className = "meta"
      meta.textContent = [item.date || "", item.note || ""].filter(Boolean).join(" • ")
      info.appendChild(title)
      info.appendChild(meta)

      const actions = document.createElement("div")
      actions.className = "actions"
      const del = document.createElement("button")
      del.className = "btn btn-ghost"
      del.textContent = "Delete"
      del.addEventListener("click", () => {
        const all = loadItinerary()
        const arr = (all[place] || []).filter((x) => x.id !== item.id)
        all[place] = arr
        saveItinerary(all)
        renderItinerary(place)
      })
      actions.appendChild(del)

      li.appendChild(info)
      li.appendChild(actions)
      itineraryList.appendChild(li)
    })
}

function cryptoRandomId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID()
  return "id-" + Math.random().toString(36).slice(2, 10)
}

function friendlyUnsplashError(err) {
  const m = String(err?.message || "")
  if (/403/.test(m)) {
    return "Photo API limit reached or invalid key. Photos may not display."
  }
  return "We couldn't fetch photos right now. Please try again later."
}
