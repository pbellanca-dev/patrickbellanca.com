// Swap a YouTube thumbnail for the player only when tapped (keeps pages fast).
document.querySelectorAll('a[data-yt]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    e.preventDefault();
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + a.dataset.yt + '?autoplay=1';
    f.title = 'YouTube video';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    a.replaceWith(f);
  });
});
