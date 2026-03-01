const selectBtn = document.getElementById("selectFolder");
const mainImage = document.getElementById("mainImage");
const imageInfo = document.getElementById("imageInfo");
const thumbRibbon = document.getElementById("thumbRibbon");
const addToDeleteBtn = document.getElementById("addToDelete");
const reviewDeleteBtn = document.getElementById("reviewDelete");
const reviewBadge = document.getElementById("reviewBadge");
const reviewModal = document.getElementById("reviewModal");
const reviewList = document.getElementById("reviewList");
const cancelReview = document.getElementById("cancelReview");
const confirmDelete = document.getElementById("confirmDelete");

let currentImages = [];
let currentIndex = 0;
let deleteList = [];

// Intersection Observer for lazy-loading thumbnails
let thumbnailObserver = null;
function initThumbnailObserver() {
  if (thumbnailObserver) thumbnailObserver.disconnect();
  thumbnailObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;
          if (src && !img.src) {
            img.src = "file://" + src;
          }
          thumbnailObserver.unobserve(img);
        }
      });
    },
    { rootMargin: "100px" },
  );
  const thumbs = thumbRibbon.querySelectorAll("img[data-src]");
  thumbs.forEach((thumb) => thumbnailObserver.observe(thumb));
}

function setMainImage(index, animate = false) {
  if (!currentImages || !currentImages.length) return;
  // clamp
  index = Math.max(0, Math.min(index, currentImages.length - 1));

  // update selected thumb immediately
  const thumbs = thumbRibbon.querySelectorAll("img");
  thumbs.forEach((t, i) => {
    t.classList.toggle("selected", i === index);
  });

  if (!animate) {
    currentIndex = index;
    const src = currentImages[index];
    mainImage.classList.add("loading");
    mainImage.onload = () => {
      mainImage.classList.remove("loading");
      imageInfo.textContent = `${index + 1} / ${currentImages.length}`;
      centerThumbnail(index);
    };
    mainImage.src = "file://" + src;
    return;
  }

  // animated advance: swipe out, then swap src, then swipe in
  // if an animation is already in progress, cancel and proceed
  mainImage.classList.remove("swipe-in");
  mainImage.classList.add("swipe-out");

  const onTransitionEnd = (e) => {
    // ensure we respond to transform/opacity transition end
    if (e.propertyName && !/transform|opacity/.test(e.propertyName)) return;
    mainImage.removeEventListener("transitionend", onTransitionEnd);
    // prepare for new image
    currentIndex = index;
    const src = currentImages[index];
    mainImage.classList.remove("swipe-out");
    mainImage.classList.add("loading");
    mainImage.onload = () => {
      mainImage.classList.remove("loading");
      // trigger swipe-in
      requestAnimationFrame(() => {
        mainImage.classList.add("swipe-in");
        // remove the class after the animation duration
        setTimeout(() => mainImage.classList.remove("swipe-in"), 350);
      });
      imageInfo.textContent = `${index + 1} / ${currentImages.length}`;
      centerThumbnail(index);
    };
    mainImage.src = "file://" + src;
  };

  mainImage.addEventListener("transitionend", onTransitionEnd);
}

function centerThumbnail(index) {
  const thumbs = thumbRibbon.querySelectorAll("img");
  if (!thumbs || !thumbs[index]) return;
  const thumb = thumbs[index];
  // offsetLeft is measured relative to the scroll container
  const containerWidth = thumbRibbon.clientWidth;
  const thumbCenter = thumb.offsetLeft + thumb.offsetWidth / 2;
  const scrollLeft = Math.max(0, thumbCenter - containerWidth / 2);
  thumbRibbon.scrollTo({ left: scrollLeft, behavior: "smooth" });
}

function buildThumbnails(images) {
  thumbRibbon.innerHTML = "";
  const batchSize = 50;
  let loadedCount = 0;
  let errorCount = 0;

  function appendBatch(start) {
    const end = Math.min(images.length, start + batchSize);
    for (let i = start; i < end; i++) {
      const src = images[i];
      const t = document.createElement("img");
      // Store path in data attribute instead of loading immediately
      t.dataset.src = src;
      t.loading = "lazy";
      t.title = src;
      if (deleteList.includes(src)) t.classList.add("to-delete");
      t.onload = () => {
        loadedCount++;
      };
      t.onerror = (e) => {
        errorCount++;
        // thumb load error (suppressed)
      };
      (function (idx) {
        t.addEventListener("click", () => setMainImage(idx));
      })(i);
      t.addEventListener("keydown", (e) => {
        if (e.key === "Enter") setMainImage(i);
      });
      thumbRibbon.appendChild(t);
    }

    // buildThumbnails: appended ${start}..${end} / ${images.length} (suppressed)

    if (end < images.length) {
      // yield so the UI can render progressively
      setTimeout(() => appendBatch(end), 25);
    } else {
      // final buildThumbnails stats (suppressed)
      // initialize observer after all thumbnails are added
      initThumbnailObserver();
    }
  }

  appendBatch(0);
}

// renderer loaded (suppressed)
selectBtn.addEventListener("click", async () => {
  const images = await window.electron.selectFolder();
  // renderer: received images (suppressed)
  // renderer: sample (suppressed)
  if (!images) {
    thumbRibbon.innerHTML =
      '<p class="empty">No images found or selection cancelled.</p>';
    mainImage.src = "";
    imageInfo.textContent = "";
    return;
  }
  currentImages = images;
  if (images.length === 0) {
    thumbRibbon.innerHTML =
      '<p class="empty">No images found in selected folder.</p>';
    mainImage.src = "";
    imageInfo.textContent = "";
    return;
  }
  // Build thumbnails but don't load main image yet - user will click a thumbnail to load
  buildThumbnails(images);
  deleteList = [];
  updateDeleteCount();
  // Show placeholder instead of loading first image
  mainImage.src = "";
  imageInfo.textContent = `0 / ${currentImages.length}`;
});

function updateDeleteCount() {
  // update review button badge
  if (reviewBadge) {
    reviewBadge.textContent = String(deleteList.length);
    reviewBadge.style.display = deleteList.length ? "inline-block" : "none";
  }
  // update thumb markers
  const thumbs = thumbRibbon.querySelectorAll("img");
  thumbs.forEach((t, i) => {
    const src = currentImages[i];
    t.classList.toggle("to-delete", deleteList.includes(src));
  });
}

function toggleDeleteCurrent() {
  if (!currentImages || !currentImages.length) return;
  const src = currentImages[currentIndex];
  const idx = deleteList.indexOf(src);
  let added = false;
  if (idx === -1) {
    deleteList.push(src);
    added = true;
  } else deleteList.splice(idx, 1);
  updateDeleteCount();
  // move to next image when we added current image to delete list
  if (added) {
    if (currentIndex < currentImages.length - 1) setMainImage(currentIndex + 1);
    else if (currentImages.length > 1) setMainImage(0);
  }
}

addToDeleteBtn.addEventListener("click", toggleDeleteCurrent);

reviewDeleteBtn.addEventListener("click", () => {
  // build review list
  reviewList.innerHTML = "";
  if (!deleteList.length) {
    reviewList.innerHTML = '<p class="empty">No images in delete list.</p>';
  } else {
    deleteList.forEach((src) => {
      const item = document.createElement("div");
      item.className = "reviewItem";
      const thumbWrap = document.createElement("div");
      thumbWrap.className = "reviewThumb";
      const img = document.createElement("img");
      img.src = "file://" + src;
      // restore icon overlay
      const restore = document.createElement("button");
      restore.className = "restoreBtn btn";
      restore.title = "Restore";
      restore.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v6" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 9l4-4 4 4" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      restore.addEventListener("click", () => {
        deleteList = deleteList.filter((s) => s !== src);
        updateDeleteCount();
        item.remove();
      });
      thumbWrap.appendChild(img);
      thumbWrap.appendChild(restore);
      item.appendChild(thumbWrap);
      reviewList.appendChild(item);
    });
  }
  reviewModal.classList.remove("hidden");
});

cancelReview.addEventListener("click", () => {
  reviewModal.classList.add("hidden");
});

confirmDelete.addEventListener("click", async () => {
  if (!deleteList.length) return;
  confirmDelete.disabled = true;
  confirmDelete.classList.add("busy");
  try {
    const results = await window.electron.deleteFiles(deleteList);
    // remove successfully trashed files from currentImages
    const removed = results.filter((r) => r.ok).map((r) => r.path);
    currentImages = currentImages.filter((p) => !removed.includes(p));
    // clear deleteList entries that were removed
    deleteList = deleteList.filter((p) => !removed.includes(p));
    buildThumbnails(currentImages);
    // adjust main image index
    if (currentImages.length === 0) {
      mainImage.src = "";
      imageInfo.textContent = "";
    } else {
      setMainImage(Math.min(currentIndex, currentImages.length - 1));
    }
    updateDeleteCount();
  } catch (err) {
    // deleteFiles error (suppressed)
    alert("Error deleting files: " + err);
  } finally {
    confirmDelete.disabled = false;
    confirmDelete.classList.remove("busy");
    reviewModal.classList.add("hidden");
  }
});

// keyboard navigation for viewer
document.addEventListener("keydown", (e) => {
  if (!currentImages || !currentImages.length) return;
  if (e.key === "ArrowRight") {
    setMainImage((currentIndex + 1) % currentImages.length);
  } else if (e.key === "ArrowLeft") {
    setMainImage(
      (currentIndex - 1 + currentImages.length) % currentImages.length,
    );
  } else if (e.key === "ArrowUp") {
    // 'Up Arrow' shortcut: toggle current image in delete list
    toggleDeleteCurrent();
  }
});
// end
