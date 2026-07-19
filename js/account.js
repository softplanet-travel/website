document.addEventListener("DOMContentLoaded", async () => {
  const title = document.getElementById("accountTitle");
  const subtitle = document.getElementById("accountSubtitle");
  const action = document.getElementById("accountAction");
  const status = document.getElementById("accountStatus");
  const form = document.getElementById("preferredNameForm");
  const input = document.getElementById("preferredName");
  const counter = document.getElementById("preferredNameCount");
  const profileStatus = document.getElementById("profileStatus");
  let user = await window.SoftPlanetProfile.getUser();
  let signedIn = Boolean(user);
  let profile = await window.SoftPlanetProfile.load(user);
  const authResult = window.SoftPlanetStore?.consumeAuthError();

  const SYNC_COPY = "登入後，你的旅行就能陪你到不同的裝置裡。";

  function renderAccount() {
    action.hidden = false;
    input.value = profile.preferred_name || "";
    counter.textContent = window.SoftPlanetProfile.length(input.value);
    if (signedIn) {
      title.textContent = profile.preferred_name
        ? `${profile.resolved_name}，歡迎回來`
        : "想讓 MUMU 怎麼稱呼你呢？";
      subtitle.textContent = "你的旅行已經同步好了，換手機也不怕遺失。";
      action.textContent = "登出 SoftPlanet";
      action.classList.add("secondary-account-action");
    } else if (window.SoftPlanetStore?.isGuest()) {
      title.textContent = "每一趟旅行，都值得好好保存。";
      subtitle.textContent = SYNC_COPY;
      action.textContent = "立即登入同步";
    } else {
      title.textContent = profile.preferred_name ? `${profile.resolved_name}，每一趟旅行都值得好好保存。` : "每一趟旅行，都值得好好保存。";
      subtitle.textContent = SYNC_COPY;
      action.textContent = "立即登入同步";
    }
  }

  input.addEventListener("input", () => {
    counter.textContent = window.SoftPlanetProfile.length(input.value);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    profileStatus.textContent = "正在儲存稱呼…";
    try {
      profile = await window.SoftPlanetProfile.savePreferredName(input.value, user);
      profileStatus.textContent = `已記住了，之後就叫你「${profile.resolved_name}」。`;
      renderAccount();
    } catch (error) {
      profileStatus.textContent = error.message || "暫時無法儲存稱呼，請稍後再試。";
    }
  });

  action.addEventListener("click", async () => {
    if (!window.spClient) {
      status.textContent = "目前無法連線，請確認網路後再試。";
      return;
    }
    action.disabled = true;
    status.textContent = signedIn ? "正在登出…" : "正在前往 Google 登入…";
    if (signedIn) {
      const { error } = await window.spClient.auth.signOut();
      if (error) {
        action.disabled = false;
        status.textContent = "暫時無法登出，請稍後再試。";
        return;
      }
      window.location.reload();
      return;
    }
    // signInWithOAuth normally navigates the whole page away immediately. If we're still
    // here after a few seconds, the redirect never happened (e.g. blocked navigation) -
    // don't leave the button stuck in a disabled "loading" state forever.
    const stuckTimer = setTimeout(() => {
      action.disabled = false;
      status.textContent = "登入好像卡住了，可以再試一次。";
    }, 8000);
    try {
      await window.SoftPlanetStore.googleSignIn("my.html");
    } catch (error) {
      clearTimeout(stuckTimer);
      action.disabled = false;
      status.textContent = "暫時無法登入，請稍後再試。";
    }
  });

  if (authResult) {
    status.textContent = authResult.cancelled ? "登入已取消，要再試一次嗎？" : "暫時無法完成登入，請再試一次。";
  }

  renderAccount();

  // My Space modules default to collapsed and only one may be open at a time; nothing here
  // persists across page loads, so re-entering My Space always starts fully collapsed.
  const accordion = window.SoftPlanetAccordion.createGroup();
  document.querySelectorAll(".my-accordion-item").forEach((item, index) => {
    accordion.register(`my-space-${index}`, item.querySelector(".my-accordion-header"), item.querySelector(".my-accordion-panel"));
  });
});
