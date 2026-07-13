document.addEventListener("DOMContentLoaded", async () => {
  const greeting = document.getElementById("homeGreeting");
  if (!greeting || !window.SoftPlanetProfile) return;
  const user = await window.SoftPlanetProfile.getUser();
  const profile = await window.SoftPlanetProfile.load(user);
  greeting.textContent = `${profile.resolved_name}，今天想去哪裡走走？`;
});
