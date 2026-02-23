function formatTime12Hour(timeStr) {
  const [hourStr, minuteStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const paddedMinute = minute === 0 ? '' : ':' + minute.toString().padStart(2, '0');
  return `${hour12}${paddedMinute}${ampm}`;
}

function getStoreHoursText(storeHandle) {
  const activeItem = document.querySelector(`.store-selector-item[data-handle="${storeHandle}"]`);
  if (!activeItem) return "";

  const todayIndex = new Date().getDay();
  const closingTimes = activeItem.querySelectorAll('.store-selector-item__closing-times p');
  if (!closingTimes || !closingTimes[todayIndex]) return "";

  const text = closingTimes[todayIndex].textContent.trim().toLowerCase();
  const match = text.match(/(closing|opening) at ([0-9]{1,2})(:[0-9]{2})?(am|pm)/i);
  if (!match) return "";

  const time = `${match[2]}${match[3] || ''}${match[4]}`;
  return text.includes("closing") ? `Closes at ${time}` : `Opens at ${time}`;
}

async function renderAvailabilityWidget() {
  const widget = document.getElementById("PickupAvailabilityWidget");
  if (!widget) return;

  const sku = widget.dataset.sku;
  const title = widget.dataset.title;
  const tags = (widget.dataset.tags || "").toUpperCase().split(',');
  const isPreorder = tags.includes('PREORDER');

  const header = widget.querySelector(".pickup-availability-widget__header");
  const locations = document.getElementById("rex-availability-locations");
  const moreBtn = document.getElementById("rex-availability-more");
  const sidebarList = document.getElementById("rex-sidebar-list");
  const sidebarTitle = document.getElementById("rex-sidebar-title");
  const sidebar = document.getElementById("site-availability-sidebar");

  if (!sku || !header || !locations || !moreBtn || !sidebarList || !sidebarTitle || !sidebar) {
    console.warn("Missing widget elements");
    return;
  }

  try {
    const res = await fetch(`https://rex-api.jayden-e91.workers.dev/inventory?sku=${encodeURIComponent(sku)}`);
    const data = await res.json();

    locations.innerHTML = '';
    sidebarList.innerHTML = '';

    const selectedStoreHandle = localStorage.getItem('selected-store');
    const storeSelectorElement = document.querySelector('store-selector');
    const storeNameFromHandle = storeSelectorElement?.storesList?.[selectedStoreHandle];

    const allHandles = Object.keys(storeSelectorElement?.storesList || {});
    const allStores = allHandles.map(handle => {
      const match = data.find(store =>
        store.outlet_name.trim().toLowerCase() === storeSelectorElement.storesList[handle].trim().toLowerCase()
      );
      return match || { outlet_name: storeSelectorElement.storesList[handle], available: 0 };
    });

    const storeToShow = allStores.find(store =>
      store.outlet_name.trim().toLowerCase() === storeNameFromHandle?.trim().toLowerCase()
    ) || allStores[0];

    if (storeToShow) {
  let statusText = '';
  let statusSymbol = '';

  if (storeToShow.available <= 0) {
    statusText = `Unavailable at ${storeToShow.outlet_name}`;
    statusSymbol = 'alert--error';
  } else if (isPreorder) {
    statusText = `Available for preorder at ${storeToShow.outlet_name}`;
    statusSymbol = 'alert--preorder';
  } else {
    statusText = `Available for pickup at ${storeToShow.outlet_name}`;
    statusSymbol = 'alert--success';
  }

  const availableCount = storeToShow.available > 10 ? '10+' : storeToShow.available;
  const stockText = storeToShow.available === 0
    ? 'Out of stock'
    : (isPreorder ? "Available For Preorder" : `${availableCount} in stock`);

  const hoursText = getStoreHoursText(selectedStoreHandle);
  const iconColour = storeToShow.available <= 0
  ? '#e56d6d' // red for out of stock
  : (isPreorder ? '#00dbe8' : '#52c057'); // cyan for preorder, green otherwise


  // Check if other stores have stock
  const otherStoresHaveStock = allStores.some(
    store => store.outlet_name !== storeToShow.outlet_name && store.available > 0
  );

  const otherStoresNote = (storeToShow.available <= 0 && otherStoresHaveStock)
    ? `<div class="pickup-availability-widget__other-stores text-size--small">Available at other TTW stores</div>`
    : '';

  header.innerHTML = `<span class="alert ${statusSymbol} alert--circle alert--unstyled">${statusText}</span>`;

  locations.innerHTML = `
    <div class="pickup-availability-widget__location">
      <div class="pickup-availability-widget__location-icon">
        <svg height="256" viewBox="0 0 64 64" width="256" xmlns="http://www.w3.org/2000/svg"><g style="stroke-width:2;stroke-miterlimit:10;stroke:#202020;fill:none;stroke-linejoin:round;stroke-linecap:round"><path style="fill:#e3e3e3;" d="m38.1 46h13.9l8 16h-56l8-16h13.9"/><path style="fill:${iconColour}" d="m32 2a18.1 18.1 0 0 0 -18.1 18.1c0 16.3 18.1 32.3 18.1 32.3s18.1-16 18.1-32.3a18.1 18.1 0 0 0 -18.1-18.1z"/><ellipse style="fill:black;" cx="32" cy="20" rx="6" ry="6"/></g></svg>
      </div>
      <div class="pickup-availability-widget__location-address">
        <span><strong>${storeToShow.outlet_name}</strong></span>
        <br><span class="pickup-availability-widget__location-hours">${hoursText}</span>
      </div>
      <div class="pickup-availability-widget__location-time">
        <span><strong>${stockText}</strong></span>
      </div>
    </div>
    ${otherStoresNote}
  `;

      sidebarTitle.textContent = title;

      allStores.forEach(store => {
        const storeHandle = store.outlet_name.toLowerCase().replace(/\s+/g, '-');
        const item = document.querySelector(`.store-selector-item[data-handle="${storeHandle}"]`);
        const hoursText = getStoreHoursText(selectedStoreHandle);
        
        let individualStatusSymbol = '';
        if (store.available <= 0) {
          individualStatusSymbol = 'alert--error';
        } else if (isPreorder) {
          individualStatusSymbol = 'alert--preorder';
        } else {
          individualStatusSymbol = 'alert--success';
        }

        const isCurrentStore = selectedStoreHandle === storeHandle;
        const storeCount = store.available > 10 ? '10+' : store.available;
        const sidebarStock = store.available === 0
          ? 'Out of stock'
          : (isPreorder ? "Available For Preorder" : `${storeCount} in stock`);

        sidebarList.innerHTML += `
          <li class="store-availability-list__item">
            <div class="store-availability-list-header">
              <div class="store-availability-list-header__info">
                <span class="store-availability-list-header__location text-size--large text-weight--bold">${store.outlet_name}</span>
                <span class="store-availability-list__hours">${hoursText}</span>
              </div>
              <span class="store-availability-list__stock alert ${individualStatusSymbol} alert--circle alert--unstyled">
              ${sidebarStock}
              </span>
            </div>
            <div class="store-availability-list__actions desktop-only">
              <button class="button button--small" data-set-store="${storeHandle}" ${isCurrentStore ? 'disabled' : ''}>
                ${isCurrentStore ? 'Current Store' : 'Set as my store'}
              </button>
            </div>
            <div class="store-availability-list__actions mobile-only">
              <button class="button button--small" data-set-store="${storeHandle}" ${isCurrentStore ? 'disabled' : ''}>
                ${isCurrentStore ? 'Current Store' : 'Set as my store'}
              </button>
            </div>
          </li>
        `;
      });

      sidebarList.addEventListener('click', e => {
        if (e.target.matches('[data-set-store]') && !e.target.disabled) {
          const handle = e.target.getAttribute('data-set-store');
          localStorage.setItem('selected-store', handle);
          const storeSelector = document.querySelector('store-selector');
          if (storeSelector) {
            storeSelector.changeSelectedStoreHandleContent(handle);
            storeSelector.dispatchEvent(new CustomEvent('storechanged'));
          }
          renderAvailabilityWidget();
        }
      });

      moreBtn.style.display = 'inline-block';
      sidebar.style.display = 'block';

      moreBtn.addEventListener('click', e => {
        e.preventDefault();
        const drawer = document.getElementById('site-availability-sidebar');
        if (drawer && typeof drawer.show === 'function') {
          drawer.show();
        }
      });

    } else {
      header.innerHTML = `<span class="alert alert--error alert--circle alert--unstyled">
        Not currently available for pickup
      </span>`;
    }

  } catch (err) {
    console.error('Error fetching availability:', err);
    header.innerHTML = `<span class="alert alert--error alert--circle alert--unstyled">
      Error checking availability
    </span>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById('site-availability-sidebar');
  const overlay = document.querySelector('.site-overlay');
  if (sidebar && overlay && overlay.parentNode === document.body) {
    document.body.insertBefore(sidebar, overlay.nextSibling);
  }

  renderAvailabilityWidget();

  const storeSelector = document.querySelector('store-selector');
  if (storeSelector) {
    storeSelector.addEventListener('storechanged', () => {
      renderAvailabilityWidget();
    });
  }
});