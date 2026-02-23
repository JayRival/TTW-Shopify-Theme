if ( typeof CartForm !== 'function' ) {
	class CartForm extends HTMLElement {

		constructor(){
			super();
			this.ajaxifyCartItems();
		}

		ajaxifyCartItems(){

			this.form = this.querySelector('form');

			this.querySelectorAll('[data-js-cart-item]').forEach(item=>{

				const remove = item.querySelector('.remove');
				if ( remove ) {
					remove.dataset.href = remove.getAttribute('href');
					remove.setAttribute('href', '');
					remove.addEventListener('click', (e)=>{
						e.preventDefault();
						this.updateCartQty(item, 0);
					})
				}

				const qty = item.querySelector('.qty');
				if ( qty ) {
					qty.addEventListener('input', debounce(e=>{
						e.preventDefault();
						e.target.blur();
						this.updateCartQty(item, parseInt(qty.value));
					}, 300));
					qty.addEventListener('click', (e)=>{
						e.target.select();
					})
				}

			})

		}

		updateCartQty(item, newQty){

			this.form.classList.add('processing');
			if ( this.querySelector('.alert') ) {
				this.querySelector('.alert').remove();
			}

			const body = JSON.stringify({
				id: item.dataset.id,
				quantity: newQty
			});

			fetch(KROWN.settings.routes.cart_change_url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'Accept': 'application/javascript' },
					body
				})
				.then(response => {
					if ( response.ok ) {
						return fetch('?section_id=helper-cart')
					} else {
						throw new Error('Something went wrong');
					}
				})
				.then(response => response.text())
				.then(text => {

					const sectionInnerHTML = new DOMParser().parseFromString(text, 'text/html');
					const cartFormInnerHTML = sectionInnerHTML.getElementById('AjaxCartForm').innerHTML;
					const cartSubtotalInnerHTML = sectionInnerHTML.getElementById('AjaxCartSubtotal').innerHTML;

					const cartItems = document.getElementById('AjaxCartForm');
					cartItems.innerHTML = cartFormInnerHTML;
					cartItems.ajaxifyCartItems();

					document.querySelectorAll('[data-header-cart-count]').forEach(elm=>{
						elm.textContent = cartItems.querySelector('[data-cart-count]').textContent;
					});
					document.querySelectorAll('[data-header-cart-total').forEach(elm=>{
						elm.textContent = cartItems.querySelector('[data-cart-total]').textContent;
					})
					
					if ( newQty != 0 && newQty > parseInt(cartItems.querySelector(`[data-js-cart-item][data-id="${item.dataset.id}"]`).dataset.qty) ) {
						let alert = document.createElement('span');
						alert.classList.add('alert', 'alert--error');
						alert.innerHTML = KROWN.settings.locales.cart_add_error.replace('{{ title }}', item.dataset.title);
						this.form.prepend(alert);
					} 

					document.getElementById('AjaxCartSubtotal').innerHTML = cartSubtotalInnerHTML;

				})
				.catch(e => {
					console.log(e);
					let alert = document.createElement('span');
					alert.classList.add('alert', 'alert--error');
					alert.textContent = KROWN.settings.locales.cart_general_error;
					this.form.prepend(alert);
				})
				.finally(() => {
					this.form.classList.remove('processing');
				});
		}

	} 


  if ( typeof customElements.get('cart-form') == 'undefined' ) {
		customElements.define('cart-form', CartForm);
	}

}

if ( typeof CartProductQuantity !== 'function' ) {

	class CartProductQuantity extends HTMLElement {
		constructor(){
			super();
			this.querySelector('.qty-minus').addEventListener('click', this.changeCartInput.bind(this));
			this.querySelector('.qty-plus').addEventListener('click', this.changeCartInput.bind(this));
		}
		changeCartInput(){
			setTimeout(()=>{
				document.getElementById('AjaxCartForm').updateCartQty(this.closest('[data-js-cart-item]'), parseInt(this.querySelector('.qty').value));
			}, 50);
		}
	}

  if ( typeof customElements.get('cart-product-quantity') == 'undefined' ) {
		customElements.define('cart-product-quantity', CartProductQuantity);
	}

}

if ( typeof CartProductRecommendations !== 'function' ) {

	class CartProductRecommendations extends HTMLElement {

		constructor(){
			super();
			this.generateRecommendations();
		}

		generateRecommendations(){
			const cartItems = document.getElementById('AjaxCartForm').querySelectorAll('[data-js-cart-item]');
			if ( cartItems.length > 0 ) {
				fetch(`${KROWN.settings.routes.product_recommendations_url}?section_id=helper-cart-recommendations&product_id=${cartItems[0].dataset.productId}&limit=6`)
					.then(response => response.text())
					.then(text => {
						const innerHTML = new DOMParser()
	            .parseFromString(text, 'text/html')
	            .querySelector('.cart-product-recommendations');
	          if ( innerHTML && innerHTML.querySelectorAll('[data-js-recommended-item]').length > 0 ) {
	          	document.getElementById('cart-recommendations').innerHTML = innerHTML.innerHTML;
	          }
					})
			}
		}
	}

  if ( typeof customElements.get('cart-product-recommendations') == 'undefined' ) {
		customElements.define('cart-product-recommendations', CartProductRecommendations);
	}

}

// method for apps to tap into and refresh the cart

if ( ! window.refreshCart ) {

	window.refreshCart = () => {
		
		fetch('?section_id=helper-cart')
			.then(response => response.text())
			.then(text => {

			const sectionInnerHTML = new DOMParser().parseFromString(text, 'text/html');
			const cartFormInnerHTML = sectionInnerHTML.getElementById('AjaxCartForm').innerHTML;
			const cartSubtotalInnerHTML = sectionInnerHTML.getElementById('AjaxCartSubtotal').innerHTML;

			const cartItems = document.getElementById('AjaxCartForm');
			cartItems.innerHTML = cartFormInnerHTML;
			cartItems.ajaxifyCartItems();

			document.querySelectorAll('[data-header-cart-count]').forEach(elm=>{
				elm.textContent = cartItems.querySelector('[data-cart-count]').textContent;
			});
			document.querySelectorAll('[data-header-cart-total').forEach(elm=>{
				elm.textContent = cartItems.querySelector('[data-cart-total]').textContent;
			})
			
			document.getElementById('AjaxCartSubtotal').innerHTML = cartSubtotalInnerHTML;
			document.getElementById('site-cart-sidebar').show();

		})

	}

}