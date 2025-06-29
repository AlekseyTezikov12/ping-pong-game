const heartsBg = document.querySelector('.hearts-bg');

function createHeart() {
    const heart = document.createElement('div');
    heart.className = 'heart';
    const size = Math.random() * 20 + 20; // 20-40px
    const left = Math.random() * 100; // %
    const duration = Math.random() * 2 + 4; // 4-6s
    const delay = Math.random() * 2; // 0-2s
    heart.style.left = left + 'vw';
    heart.style.width = size + 'px';
    heart.style.height = size + 'px';
    heart.style.animationDuration = duration + 's';
    heart.style.animationDelay = delay + 's';
    heart.innerHTML = `<svg viewBox="0 0 32 29" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 29s-13-8.35-13-17A7 7 0 0 1 16 5a7 7 0 0 1 13 7c0 8.65-13 17-13 17z" fill="#ff8da1" stroke="#e75480" stroke-width="2"/></svg>`;
    heartsBg.appendChild(heart);
    setTimeout(() => {
        heart.remove();
    }, (duration + delay) * 1000);
}

setInterval(createHeart, 400); 