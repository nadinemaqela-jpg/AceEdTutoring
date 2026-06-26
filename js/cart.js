// ============================================================
// SHOPPING CART LOGIC
// ============================================================

// Get cart from localStorage
function getCart() {
    const cart = localStorage.getItem('aceed_cart');
    return cart ? JSON.parse(cart) : [];
}

// Save cart to localStorage
function saveCart(cart) {
    localStorage.setItem('aceed_cart', JSON.stringify(cart));
}

// Add item to cart
function addToCart(item) {
    const cart = getCart();
    
    // Check if item already exists
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }
    
    saveCart(cart);
    updateCartCount();
}

// Remove item from cart
function removeFromCart(itemId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== itemId);
    saveCart(cart);
    updateCartCount();
}

// Update quantity
function updateQuantity(itemId, quantity) {
    const cart = getCart();
    const item = cart.find(i => i.id === itemId);
    if (item) {
        item.quantity = quantity;
        if (item.quantity <= 0) {
            removeFromCart(itemId);
        } else {
            saveCart(cart);
        }
    }
    updateCartCount();
}

// Clear cart
function clearCart() {
    localStorage.removeItem('aceed_cart');
    updateCartCount();
}

// Get cart total
function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Get cart item count
function getCartCount() {
    const cart = getCart();
    return cart.reduce((count, item) => count + item.quantity, 0);
}

// Update cart badge (for all pages)
function updateCartBadge() {
    const cart = getCart();
    const count = cart.reduce(function(total, item) {
        return total + item.quantity;
    }, 0);
    const badge = document.getElementById('cartCount');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('show', count > 0);
    }
}

// Call on page load if cart.js is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateCartBadge);
} else {
    updateCartBadge();
}

// Add to cart button handlers
document.addEventListener('DOMContentLoaded', function() {
    // Update cart count on page load
    updateCartCount();
    
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function() {
            const item = {
                id: this.dataset.id || Date.now().toString(),
                name: this.dataset.item || this.dataset.name || 'Service',
                price: parseFloat(this.dataset.price) || 0,
                type: this.dataset.type || 'service',
                image: this.dataset.image || ''
            };
            
            addToCart(item);
            
            // Show feedback
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-check"></i> Added!';
            this.style.backgroundColor = '#27ae60';
            setTimeout(() => {
                this.innerHTML = originalText;
                this.style.backgroundColor = '';
            }, 2000);
        });
    });
});
