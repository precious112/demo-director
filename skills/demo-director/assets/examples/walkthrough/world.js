/*
 * Harbor's behaviour, scripted.
 *
 * This is not the real app; it is a faithful stage of it. Every state the film
 * shows (a conversation opening, a reply sending, the status flipping) is a real
 * state the product has, reached by a real click on the real element. Timers run
 * on the engine's virtual clock, so the loading beat is exact and repeatable.
 */
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]

const thread = $(".thread")
const threadBody = $(".thread-body")
const composerText = $(".composer-text")
const composerBox = $(".composer-box")
const status = $(".status")
const toast = $(".toast")

let toastTimer = null

function selectConversation(conv) {
  $$(".conv").forEach((c) => c.classList.toggle("is-sel", c === conv))
  // The real app fetches the thread; show its own loading state, then the thread.
  thread.dataset.thread = "loading"
  const title = conv.querySelector(".subj").textContent
  const who = conv.querySelector(".who").textContent
  setTimeout(() => {
    $(".thread-title h1").textContent = title
    const meta = $(".thread-meta")
    meta.children[0].textContent = `${who} · marta@northloop.studio`
    meta.children[2].textContent = `Order ${conv.dataset.id}`
    const first = $(".messages .msg:not(.note) .msg-body p")
    if (first) first.textContent = conv.querySelector(".snip").textContent
    thread.dataset.thread = "ready"
  }, 420)
}

function showToast(text) {
  toast.querySelector(".toast-text").textContent = text
  toast.classList.add("is-on")
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.classList.remove("is-on"), 2400)
}

function sendReply() {
  const text = composerText.textContent.trim()
  if (!text) return
  const msg = document.createElement("div")
  msg.className = "msg"
  msg.innerHTML =
    '<div class="msg-av">AK</div>' +
    '<div class="msg-body"><div class="msg-top"><b>You</b><time>9:31</time></div><p></p></div>'
  msg.querySelector("p").textContent = text
  $(".messages").appendChild(msg)
  composerText.textContent = ""
  composerText.dataset.empty = "1"
  status.dataset.status = "pending"
  status.innerHTML = "<i></i>Pending"
  showToast("Reply sent")
}

// Real pointer events, so the engine's clicks and the world agree.
$$(".conv").forEach((conv) => conv.addEventListener("click", () => selectConversation(conv)))

composerText.addEventListener("focus", () => composerBox.classList.add("is-focus"))
composerText.addEventListener("input", () => {
  composerText.dataset.empty = composerText.textContent.trim() ? "0" : "1"
})
$(".send-btn").addEventListener("mousedown", (e) => { e.currentTarget.classList.add("is-press"); e.preventDefault() })
$(".send-btn").addEventListener("mouseup", (e) => e.currentTarget.classList.remove("is-press"))
$(".send-btn").addEventListener("click", sendReply)

// The film may want to read state or drive a beat the pointer cannot (rare).
window.__world = { selectConversation, sendReply, showToast }
