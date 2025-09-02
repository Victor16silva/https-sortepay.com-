/**
 * ScrollStack Component
 * A reusable scroll-based stacking component with smooth transitions
 */
class ScrollStack {
    constructor(container, options = {}) {
        this.container = container;
        this.stackContainer = container.querySelector('.scroll-stack-container');
        this.items = Array.from(container.querySelectorAll('.scroll-stack-item'));
        this.indicators = [];
        this.currentIndex = 0;
        
        this.options = {
            threshold: 0.5,
            rootMargin: '-10% 0px -10% 0px',
            showIndicators: true,
            enableKeyboardNav: true,
            ...options
        };

        this.init();
    }

    init() {
        this.setupContainer();
        this.setupIndicators();
        this.setupIntersectionObserver();
        this.setupIndicatorClicks();
        this.setupScrollSnap();
        this.setupKeyboardNav();
        this.updateStack(0);
    }

    setupContainer() {
        // Add necessary classes to container
        this.container.classList.add('scroll-stack');
        
        // Create stack container if it doesn't exist
        if (!this.stackContainer) {
            this.stackContainer = document.createElement('div');
            this.stackContainer.className = 'scroll-stack-container';
            
            // Move all items to stack container
            while (this.container.firstChild) {
                if (this.container.firstChild.classList && 
                    this.container.firstChild.classList.contains('scroll-stack-item')) {
                    this.stackContainer.appendChild(this.container.firstChild);
                } else {
                    this.container.removeChild(this.container.firstChild);
                }
            }
            
            this.container.appendChild(this.stackContainer);
            this.items = Array.from(this.stackContainer.querySelectorAll('.scroll-stack-item'));
        }

        // Add data-index to items
        this.items.forEach((item, index) => {
            item.dataset.index = index;
        });
    }

    setupIndicators() {
        if (!this.options.showIndicators || this.items.length <= 1) return;

        const indicatorsContainer = document.createElement('div');
        indicatorsContainer.className = 'scroll-indicators';

        this.items.forEach((_, index) => {
            const indicator = document.createElement('div');
            indicator.className = index === 0 ? 'indicator active' : 'indicator';
            indicator.dataset.index = index;
            indicatorsContainer.appendChild(indicator);
            this.indicators.push(indicator);
        });

        this.container.appendChild(indicatorsContainer);
    }

    setupIntersectionObserver() {
        const observerOptions = {
            threshold: this.options.threshold,
            rootMargin: this.options.rootMargin,
            root: this.stackContainer
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const index = parseInt(entry.target.dataset.index);
                if (entry.isIntersecting && entry.intersectionRatio >= this.options.threshold) {
                    this.updateStack(index);
                }
            });
        }, observerOptions);

        this.items.forEach(item => {
            this.observer.observe(item);
        });
    }

    setupIndicatorClicks() {
        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                this.scrollToItem(index);
            });
        });
    }

    setupScrollSnap() {
        let scrollTimeout;
        this.stackContainer.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.handleScrollEnd();
            }, 150);
        });
    }

    setupKeyboardNav() {
        if (!this.options.enableKeyboardNav) return;

        document.addEventListener('keydown', (e) => {
            if (!this.isInViewport()) return;

            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                this.next();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                this.prev();
            }
        });
    }

    isInViewport() {
        const rect = this.container.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
    }

    handleScrollEnd() {
        const containerRect = this.stackContainer.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;
        
        let closestIndex = 0;
        let closestDistance = Infinity;

        this.items.forEach((item, index) => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.top + itemRect.height / 2;
            const distance = Math.abs(itemCenter - containerCenter);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        this.updateStack(closestIndex);
    }

    updateStack(activeIndex) {
        this.currentIndex = activeIndex;

        this.items.forEach((item, index) => {
            item.classList.remove('active', 'stacked');
            
            if (index === activeIndex) {
                item.classList.add('active');
            } else {
                item.classList.add('stacked');
                const stackIndex = Math.abs(activeIndex - index);
                item.style.setProperty('--stack-index', Math.min(stackIndex, 5));
            }
        });

        this.indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === activeIndex);
        });

        // Emit custom event
        this.container.dispatchEvent(new CustomEvent('scrollstack:change', {
            detail: { activeIndex, activeItem: this.items[activeIndex] }
        }));
    }

    scrollToItem(index) {
        if (index >= 0 && index < this.items.length) {
            const targetItem = this.items[index];
            const containerRect = this.stackContainer.getBoundingClientRect();
            const itemRect = targetItem.getBoundingClientRect();
            const currentScroll = this.stackContainer.scrollTop;
            const targetScroll = currentScroll + itemRect.top - containerRect.top - 50;

            this.stackContainer.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        }
    }

    // Public API methods
    next() {
        if (this.currentIndex < this.items.length - 1) {
            this.scrollToItem(this.currentIndex + 1);
        }
    }

    prev() {
        if (this.currentIndex > 0) {
            this.scrollToItem(this.currentIndex - 1);
        }
    }

    goTo(index) {
        this.scrollToItem(index);
    }

    getCurrentIndex() {
        return this.currentIndex;
    }

    getItemCount() {
        return this.items.length;
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// ScrollStackItem helper function
function ScrollStackItem({ children, className = '', ...props }) {
    const itemClass = `scroll-stack-item ${className}`.trim();
    
    if (typeof children === 'string') {
        return `<div class="${itemClass}" ${Object.entries(props).map(([key, value]) => `${key}="${value}"`).join(' ')}>${children}</div>`;
    }
    
    // For use with createElement
    const div = document.createElement('div');
    div.className = itemClass;
    Object.entries(props).forEach(([key, value]) => {
        div.setAttribute(key, value);
    });
    
    if (children instanceof HTMLElement) {
        div.appendChild(children);
    } else if (Array.isArray(children)) {
        children.forEach(child => {
            if (child instanceof HTMLElement) {
                div.appendChild(child);
            }
        });
    }
    
    return div;
}

// Auto-initialize ScrollStack components
document.addEventListener('DOMContentLoaded', () => {
    const scrollStackElements = document.querySelectorAll('[data-scroll-stack]');
    
    scrollStackElements.forEach(element => {
        const options = {};
        
        // Parse options from data attributes
        if (element.dataset.threshold) {
            options.threshold = parseFloat(element.dataset.threshold);
        }
        if (element.dataset.showIndicators === 'false') {
            options.showIndicators = false;
        }
        if (element.dataset.enableKeyboardNav === 'false') {
            options.enableKeyboardNav = false;
        }
        
        const scrollStack = new ScrollStack(element, options);
        
        // Store reference on element for external access
        element.scrollStack = scrollStack;
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScrollStack, ScrollStackItem };
}

// Global access
window.ScrollStack = ScrollStack;
window.ScrollStackItem = ScrollStackItem;