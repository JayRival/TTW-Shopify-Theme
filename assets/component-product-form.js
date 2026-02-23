if ( typeof ProductVariants !== 'function' ) {
	class ProductVariants extends HTMLElement {

		constructor() {

			super();
			this.price = document.querySelector(`#product-price-${this.dataset.id}`);

			if ( this.price ) {
				this.priceOriginal = this.price.querySelector('[data-js-product-price-original]');
				this.priceCompare = this.price.querySelector('[data-js-product-price-compare]');
				this.priceUnit = this.price.querySelector('[data-js-product-price-unit]');
			}

			this.productForm = document.querySelector(`#product-form-${this.dataset.id}`);
			if ( this.productForm ) {
				this.productQty = this.productForm.querySelector('[data-js-product-quantity]');
				this.addToCart = this.productForm.querySelector('[data-js-product-add-to-cart]');
				this.addToCartText = this.productForm.querySelector('[data-js-product-add-to-cart-text]');
			}

			this.addEventListener('change', this.onVariantChange);

			this.updateOptions();
			this.updateMasterId();
			this.updateUnavailableVariants();

			this.productStock = this.querySelector('[data-js-variant-quantity]');
			if ( this.productStock && this.querySelector('[data-js-variant-quantity-data]') ) {
				this.productStockData = JSON.parse(this.querySelector('[data-js-variant-quantity-data]').dataset.inventory);
			}
			this.updateStock();

			this._event = new Event('VARIANT_CHANGE');

		}

		onVariantChange(){

			this.updateOptions();
			this.updateMasterId();
			this.updateVariantInput();
			if ( this.price ) {
				this.updatePrice();
			}
			this.updateStock();
			this.updateUnavailableVariants();
			this.updatePickupAvailability();
			if ( ! this.hasAttribute('data-no-history') ) {
				this.updateURL();
			}
			this.updateDetails();

			if ( this.productForm ) {
				if ( ! this.currentVariant || ! this.currentVariant.available ) {
					if ( this.productQty ) this.productQty.style.display = 'none';
					this.addToCart.classList.add('disabled');
					this.productForm.classList.add('disabled-cart');
					this.addToCartText.textContent = KROWN.settings.locales.products_sold_out_variant;
				} else {
					if ( this.productQty ) this.productQty.style.display = '';
					this.addToCart.classList.remove('disabled');
					this.productForm.classList.remove('disabled-cart');
					this.addToCartText.textContent = KROWN.settings.locales.products_add_to_cart_button;
				}
				if ( ! this.currentVariant ) {
					this.productForm.classList.add('unavailable-variant');
					this.addToCartText.textContent = KROWN.settings.locales.products_unavailable_variant;
				} else {
					this.productForm.classList.remove('unavailable-variant');
				}
			}
			this.dispatchEvent(this._event);

		}

		updateOptions(){
			if ( this.dataset.type == 'select' ) {
				this.options = Array.from(this.querySelectorAll('.product-variant-container'), (select) => select.value);
			} else if ( this.dataset.type == 'radio' ) {
				this.options = [];
				this.querySelectorAll('.product-variant__input').forEach(elm=>{
					if ( elm.checked ) {
						this.options.push(elm.value);
					}
				});
			}
		}

		updateMasterId(){
			this.currentVariant = this.getVariantData().find((variant) => {
				return !variant.options.map((option, index) => {
					return this.options[index] === option;
				}).includes(false);
			});
		}

		updatePrice(){
			
			if (!this.currentVariant) {
				this.priceOriginal.innerHTML = '';
				this.priceCompare.innerHTML = '';
				this.priceUnit.innerHTML = '';
			} else {
				this.priceOriginal.innerHTML = this._formatMoney(this.currentVariant.price, KROWN.settings.shop_money_format);
				if ( this.currentVariant.compare_at_price > this.currentVariant.price ) {
					this.priceCompare.innerHTML = this._formatMoney(this.currentVariant.compare_at_price, KROWN.settings.shop_money_format);
				} else {
					this.priceCompare.innerHTML = '';
				}

				if ( this.currentVariant.unit_price_measurement ) {
					this.priceUnit.innerHTML = `
						${this._formatMoney(this.currentVariant.unit_price, KROWN.settings.shop_money_format)} / 
						${( this.currentVariant.unit_price_measurement.reference_value != 1 ? this.currentVariant.unit_price_measurement.reference_value + ' ' : '' )}
						${this.currentVariant.unit_price_measurement.reference_unit}
					`;
				} else {
					this.priceUnit.innerHTML = '';
				}
			}
		
		}

		updateStock(){
			if (!this.currentVariant) {
				if ( this.productStock )
				this.productStock.innerHTML = '';
			} else {
				if ( this.productStock && this.productStockData ) {
					let currentVariant = false;
					for ( const variant of this.productStockData ) {
						if ( variant.id == this.currentVariant.id ) {
							currentVariant = variant;
							break;
						}
					}
					this.productStock.innerHTML = '';
					if ( currentVariant ) {
						if ( currentVariant.quantity <= 0 ) {
							if ( currentVariant.inventory == 'continue' ) {
								this.productStock.innerHTML = KROWN.settings.locales.products_preorder;
							} else if ( currentVariant.inventory == 'deny' ) {
								this.productStock.innerHTML = KROWN.settings.locales.products_no_products;
							}
						} else if ( currentVariant.quantity == '1' ) {
							this.productStock.innerHTML = KROWN.settings.locales.products_one_product;
						} else if ( currentVariant.quantity <= 5 ) {
							this.productStock.innerHTML = KROWN.settings.locales.products_few_products.replace('{{ count }}', currentVariant.quantity);
						} else if ( currentVariant.unavailable ) {
							this.productStock.innerHTML = KROWN.settings.locales.products_no_products;
						} else if ( currentVariant.quantity > 5 && this.productStock.dataset.type == "always" ) {
							this.productStock.innerHTML = KROWN.settings.locales.products_few_products.replace('{{ count }}', currentVariant.quantity);
						}
					}
				}
			}
		}

		updateDetails(){

			document.querySelectorAll(`#product-${this.dataset.id} [data-js-product-sku]`).forEach(elm=>{
				if ( this.currentVariant.sku ) {
					elm.innerHTML = KROWN.settings.locales.product_sku + this.currentVariant.sku;
				} else {
					elm.innerHTML = '';
				}
			});

			document.querySelectorAll(`#product-${this.dataset.id} [data-js-product-barcode]`).forEach(elm=>{
				if ( this.currentVariant.barcode ) {
					elm.innerHTML = KROWN.settings.locales.product_barcode + this.currentVariant.barcode;
				} else {
					elm.innerHTML = '';
				}
			});
			
		}

		updatePickupAvailability() {
			const pickUpAvailability = document.querySelector('pickup-availability');
			if (!pickUpAvailability) return;

			if (this.currentVariant && this.currentVariant.available) {
				pickUpAvailability.fetchAvailability(this.currentVariant.id);
			} else {
				pickUpAvailability.removeAttribute('available');
				pickUpAvailability.innerHTML = '';
			}
		}

		updateUnavailableVariants(){

			if ( this.dataset.hideVariants == 'true' ) {

				let options1 = {},
						options2 = {},
						options3 = {},

						option1Selected = null,
						option2Selected = null;

				if ( this.dataset.variants > 1 ) {
					option1Selected = this._getSelectedOption(0);
					this._resetDisabledOption(1);
				}
				if ( this.dataset.variants > 2 ) {
					option2Selected = this._getSelectedOption(1);
					this._resetDisabledOption(2);
				}

				this.getVariantData().forEach((el) => {

					if ( this.dataset.variants > 0 ) {
						if ( ! options1[el.option1] ) {
							options1[el.option1] = [];
						}
						options1[el.option1].push(String(el.available));
					}
					if ( this.dataset.variants > 1 ) {
						if ( ! options2[el.option2] ) {
							options2[el.option2] = [];
						}
						options2[el.option2].push(String(el.available));
					}
					if ( this.dataset.variants == 2 ) {
						if ( el.option1 == option1Selected && ! el.available ) {
							this._setDisabledOption(1, el.option2);
						}
					}
					if ( this.dataset.variants > 2 ) {
						if ( ! options3[el.option3] ) {
							options3[el.option3] = [];
						}
						options3[el.option3].push(String(el.available));
						if ( el.option2 == option2Selected && el.option1 == option1Selected && ! el.available ) {
							this._setDisabledOption(2, el.option3);
						}
					}

				});

				if ( this.dataset.variants > 0 ) {
					Object.keys(options1).forEach((key)=>{
						if ( ! options1[key].includes('true') ){
							this.querySelectorAll('.product-variant')[0].querySelector(`.product-variant-value[value="${key}"]`).classList.add('disabled');
						}
					});
				}
				if ( this.dataset.variants > 1 ) {
					Object.keys(options2).forEach((key)=>{
						if ( ! options2[key].includes('true') ){
							this.querySelectorAll('.product-variant')[1].querySelector(`.product-variant-value[value="${key}"]`).classList.add('disabled');
						}
					});
				}
				if ( this.dataset.variants > 2 ) {
					Object.keys(options3).forEach((key)=>{
						if ( ! options3[key].includes('true') ){
							this.querySelectorAll('.product-variant')[2].querySelector(`.product-variant-value[value="${key}"]`).classList.add('disabled');
						}
					});
					Object.keys(options2).forEach((key)=>{
						if ( ! options2[key].includes('true') ){
							if ( option2Selected == key ) {
								this.querySelectorAll('.product-variant')[2].querySelector('.product-variant-value').classList.add('disabled');
							}
						}
					});
				}

			}
		}

		_getSelectedOption(i){
			if ( this.dataset.type == 'select' ) {
				return this.querySelectorAll('.product-variant')[i].querySelector('.product-variant-container').value;
			} else if ( this.dataset.type == 'radio' ) {
				let selectedOption = null;
				this.querySelectorAll('.product-variant')[i].querySelectorAll('.product-variant__input').forEach(elm=>{ if (elm.checked) selectedOption = elm.value });
				return selectedOption;
			}
		}

		_resetDisabledOption(i){
			this.querySelectorAll('.product-variant')[i].querySelectorAll('.product-variant-value').forEach((elm)=>{
				elm.classList.remove('disabled');
			})
		}

		_setDisabledOption(i,option){
			this.querySelectorAll('.product-variant')[i].querySelector(`.product-variant-value[value="${option}"]`).classList.add('disabled');
		}

		updateURL(){
			if (!this.currentVariant) return;
			window.history.replaceState({ }, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
		}

		updateVariantInput() {
			if (!this.currentVariant) return;
			const productForms = document.querySelectorAll(`#product-form-${this.dataset.id}, #product-form-installment`);
			productForms.forEach((productForm) => {
				const input = productForm.querySelector('input[name="id"]');
				input.value = this.currentVariant.id;
				input.dispatchEvent(new Event('change', { bubbles: true }));
			});
		}

		getVariantData() {
			this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
			return this.variantData;
		}

		_formatMoney(cents, format) {

			if (typeof cents === 'string') {
				cents = cents.replace('.', '');
			}
	
			let value = '';
			const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
			const formatString = format || moneyFormat;
	
			function formatWithDelimiters(number, precision, thousands, decimal) {
				thousands = thousands || ',';
				decimal = decimal || '.';
	
				if (isNaN(number) || number === null) {
					return 0;
				}
	
				number = (number / 100.0).toFixed(precision);
	
				const parts = number.split('.');
				const dollarsAmount = parts[0].replace(
					/(\d)(?=(\d\d\d)+(?!\d))/g,
					'$1' + thousands
				);
				const centsAmount = parts[1] ? decimal + parts[1] : '';
	
				return dollarsAmount + centsAmount;
			}
	
			switch (formatString.match(placeholderRegex)[1]) {
				case 'amount':
					value = formatWithDelimiters(cents, 2);
					break;
				case 'amount_no_decimals':
					value = formatWithDelimiters(cents, 0);
					break;
				case 'amount_with_comma_separator':
					value = formatWithDelimiters(cents, 2, '.', ',');
					break;
				case 'amount_no_decimals_with_comma_separator':
					value = formatWithDelimiters(cents, 0, '.', ',');
					break;
				case 'amount_no_decimals_with_space_separator':
					value = formatWithDelimiters(cents, 0, ' ');
					break;
				case 'amount_with_apostrophe_separator':
					value = formatWithDelimiters(cents, 2, "'");
					break;
			}
	
			return formatString.replace(placeholderRegex, value);
	
		}

	}

  if ( typeof customElements.get('product-variants') == 'undefined' ) {
		customElements.define('product-variants', ProductVariants);
	}

}

/* ---
	Product Form
--- */


if ( typeof ProductForm !== 'function' ) {
	class ProductForm extends HTMLElement {
		constructor() {
			super();   
			this.init();
		}

		init(){
			if ( this.hasAttribute('data-ajax-cart') && ! document.body.classList.contains('template-cart') ) {
				this.form = this.querySelector('form');
				this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
				this.ADD_TO_CART = new Event('add-to-cart');
			}
		}

		onSubmitHandler(e) {

			e.preventDefault();
			
			const submitButton = this.querySelector('[type="submit"]');

			submitButton.classList.add('working');

			const body = this._serializeForm(this.form);
			let alert = '';

			fetch(`${KROWN.settings.routes.cart_add_url}.js`, {
				body,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'X-Requested-With': 'XMLHttpRequest'
				},
				method: 'POST'
			})
				.then(response => response.json())
				.then(response => {
					if ( response.status == 422 ) {
						// wrong stock logic alert
						alert = document.createElement('span');
						alert.className = 'alert alert--error';
						alert.innerHTML = response.description
						return fetch('?section_id=helper-cart');
					} else {
						return fetch('?section_id=helper-cart');
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

					if ( alert != '' ) {
						document.getElementById('AjaxCartForm').querySelector('form').prepend(alert);
					}

					document.getElementById('AjaxCartSubtotal').innerHTML = cartSubtotalInnerHTML;

					document.querySelectorAll('[data-header-cart-count]').forEach(elm=>{
						elm.textContent = document.querySelector('#AjaxCartForm [data-cart-count]').textContent;
					});
					document.querySelectorAll('[data-header-cart-total').forEach(elm=>{
						elm.textContent = document.querySelector('#AjaxCartForm [data-cart-total]').textContent;
					});
					this.dispatchEvent(this.ADD_TO_CART);

				})
				.catch(e => {
					console.log(e);
				})
				.finally(() => {
					submitButton.classList.remove('working');
				});
		}

		_serializeForm(form) {
			let arr = [];
			Array.prototype.slice.call(form.elements).forEach(function(field) {
				if (
					!field.name ||
					field.disabled ||
					['file', 'reset', 'submit', 'button'].indexOf(field.type) > -1
				)
					return;
				if (field.type === 'select-multiple') {
					Array.prototype.slice.call(field.options).forEach(function(option) {
						if (!option.selected) return;
						arr.push(
							encodeURIComponent(field.name) +
								'=' +
								encodeURIComponent(option.value)
						);
					});
					return;
				}
				if (['checkbox', 'radio'].indexOf(field.type) > -1 && !field.checked)
					return;
				arr.push(
					encodeURIComponent(field.name) + '=' + encodeURIComponent(field.value)
				);
			});
			return arr.join('&');
		}

	}

  if ( typeof customElements.get('product-form') == 'undefined' ) {
		customElements.define('product-form', ProductForm);
	}

}