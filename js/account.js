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

  function renderAccount() {
    action.hidden = false;
    input.value = profile.preferred_name || "";
    counter.textContent = window.SoftPlanetProfile.length(input.value);
    if (signedIn) {
      title.textContent = profile.preferred_name
        ? `${profile.resolved_name}，歡迎回來`
        : "想讓 MUMU 怎麼稱呼你呢？";
      subtitle.textContent = "登入後即可同步你的旅行、收藏與攻略，換手機也不怕遺失。";
      action.textContent = "登出 SoftPlanet";
      action.classList.add("secondary-account-action");
    } else if (window.SoftPlanetStore?.isGuest()) {
      title.textContent = "每一趟旅行，都值得好好保存。";
      subtitle.textContent = "登入後即可同步你的旅行、收藏與攻略，換手機也不怕遺失。";
      action.textContent = "立即登入同步";
    } else {
      title.textContent = profile.preferred_name ? `${profile.resolved_name}，每一趟旅行都值得好好保存。` : "每一趟旅行，都值得好好保存。";
      subtitle.textContent = "登入後即可同步你的旅行、收藏與攻略，換手機也不怕遺失。";
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
    const returnTo = sessionStorage.getItem("softplanet-return-to") || "my.html";
    const { error } = await window.spClient.auth.signInWithOAuth({ provider: "google", options: { redirectTo: new URL(returnTo, window.location.href).href } });
    if (error) {
      action.disabled = false;
      status.textContent = "暫時無法登入，請稍後再試。";
    }
  });

  renderAccount();
});
