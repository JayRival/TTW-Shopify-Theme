if ( typeof VideoPopup !== 'function' ) {

  class VideoPopup extends HTMLElement {

    constructor(){
      
      super();

      this.querySelector('[data-js-video-popup-link]').addEventListener('click',e=>{

        e.preventDefault();

        const blackout = document.createElement('div');
        blackout.classList.add('video-popup__blackout');
        this.append(blackout);
        setTimeout(()=>{
          blackout.style.opacity = '1';
        },10)

        this.classList.add('video-opened');

        if ( this.querySelector('[data-js-video-popup-close]') ) {
          this.querySelector('[data-js-video-popup-close]').addEventListener('click', e=>{
            this.querySelectorAll('iframe, video').forEach(elm=>{elm.remove()});
            blackout.remove();
            this.classList.remove('video-opened');
          })
        }

        setTimeout(()=>{
          this.querySelector('[data-js-video-popup-container]').appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));
          setTimeout(()=>{
            this._playMedia(this.closest('[data-video]'));
          }, 500);
        },50);

      });

    }

    _playMedia(media){
			switch ( media.dataset.productMediaType ) {
				case 'video':
					if ( media.querySelector('video') ) {
						media.querySelector('video').play();
					}
					break;
				case 'external_video-youtube':
					if ( media.querySelector('.js-youtube') ) {
						media.querySelector('.js-youtube').contentWindow.postMessage('{"event":"command","func":"' + 'playVideo' + '","args":""}', '*');
					}
					break;
				case 'external_video-vimeo':
					if ( media.querySelector('.js-vimeo') ) {
						media.querySelector('.js-vimeo').contentWindow.postMessage('{"method":"play"}', '*');
					}
					break;
			}
		}

  }

  if ( typeof customElements.get('video-popup') == 'undefined' ) {
    customElements.define('video-popup', VideoPopup);
  }

}

if ( typeof VideoBackground !== 'function' ) {

  class VideoBackground extends HTMLElement {

    constructor(){

      super();
      this.isAutoplaySupported(canAutoPlay=>{
        if ( canAutoPlay ) {
          const video = this.querySelector('.video-text__background');
          if ( video ) {
            video.innerHTML = `<video autoplay muted loop playsinline><source type="video/mp4" src="${video.dataset.src}"></video>`;
            video.querySelector('video').play();
            setTimeout(()=>{
              video.querySelector('video').style.opacity = '1';
            }, 200);
          }
        } else {
          this.querySelector('.video-text__background .video-text__image').style.display = 'block';
        }
      })
      
    }

    isAutoplaySupported(callback) {
      if ( typeof callback !== 'function' ) {
        return false;
      }
    
      if ( ! sessionStorage.getItem('autoplaySupported' ) ) {
        const canSrc = 'data:video/mp4;base64,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';
        let canVideoPlaying = false;
        let canVideo = document.createElement('video');
        canVideo.setAttribute('playsinline', 'playsinline');
        canVideo.setAttribute('muted', 'muted');
        canVideo.setAttribute('autoplay', 'autoplay');
        canVideo.setAttribute('loop', 'loop');
        canVideo.setAttribute('controls', 'controls');
        canVideo.setAttribute('width', 20);
        canVideo.setAttribute('height', 20);
        canVideo.onplay = ()=>{canVideoPlaying = true}
        canVideo.setAttribute('src', canSrc);
        canVideo.style.position = 'fixed';
        canVideo.style.top = '-20px';
        canVideo.style.left = '0px';
        canVideo.style.zIndex = '997';
        document.querySelector('body').appendChild(canVideo);
    
        let playPromise = canVideo.play();
        if ( playPromise !== undefined ) {
          playPromise.then(()=>{
            callback(true);
            sessionStorage.setItem('autoplaySupported', 'true')
            canVideo.remove();
          })
          .catch((error)=>{
            if ( canVideoPlaying || error.toString().includes('interact with the document') ) {
              callback(true);
              sessionStorage.setItem('autoplaySupported', 'true')
            } else {
              callback(false);
              sessionStorage.setItem('autoplaySupported', 'false');
            }
            canVideo.remove();
          })
        }
    
      } else {
        if ( sessionStorage.getItem('autoplaySupported') == 'true' ) {
          callback(true);
        } else {
          callback(false);
        }
      }
    }

  }
  
  if ( typeof customElements.get('video-background') == 'undefined' ) {
    customElements.define('video-background', VideoBackground);
  }

}