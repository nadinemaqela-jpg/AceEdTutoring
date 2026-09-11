// ============================================================
// ACEED TUTORING CART - Simplified for Invoice-Based Flow
// ============================================================

const CART_KEY = 'aceed_cart';

// ------------------------------------------------------------
// Core cart operations
// ------------------------------------------------------------
function getCart() {
    try {
        const cart = localStorage.getItem(CART_KEY);
        return cart ? JSON.parse(cart) : [];
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
}

function addToCart(item) {
    const cart = getCart();
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }
    saveCart(cart);
}

function removeFromCart(itemId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== itemId);
    saveCart(cart);
}

function updateQuantity(itemId, quantity) {
    const cart = getCart();
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    if (quantity <= 0) {
        removeFromCart(itemId);
    } else {
        item.quantity = quantity;
        saveCart(cart);
    }
}

function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartBadge();
}

function getCartTotal() {
    return getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function getCartCount() {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

// ------------------------------------------------------------
// Cart badge (header icon)
// ------------------------------------------------------------
function updateCartBadge() {
    const count = getCartCount();
    const badge = document.getElementById('cartCount');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('show', count > 0);
    }
}

// ------------------------------------------------------------
// Request Invoice - Creates invoice + emails parent & admin
// ------------------------------------------------------------
async function requestInvoice() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('Please sign in first.');
        window.location.href = 'signin.html?redirect=cart.html';
        return;
    }

    const cart = getCart();
    if (cart.length === 0) {
        alert('Your cart is empty.');
        return;
    }

    // Disable button to prevent double-click
    const btn = document.getElementById('requestInvoiceBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating invoice...';
    }

    try {
        const db = firebase.firestore();

        // 1. Get parent data
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        const parentName = userData.fullName || user.email;
        const parentPhone = userData.phone || '';

        // 2. Generate invoice number using a counter
        const counterRef = db.collection('counters').doc('invoices');
        const counterDoc = await counterRef.get();
        let nextNum = 1;
        if (counterDoc.exists) {
            nextNum = (counterDoc.data().lastNumber || 0) + 1;
        }
        await counterRef.set({ lastNumber: nextNum }, { merge: true });

        const year = new Date().getFullYear();
        const invoiceNumber = 'ACE-' + year + '-' + String(nextNum).padStart(4, '0');
        const surname = (parentName.split(' ').slice(-1)[0] || 'PARENT').toUpperCase();
        const paymentRef = 'ACE-' + surname + '-' + String(nextNum).padStart(3, '0');

        // 3. Build items + total
        const items = cart.map(item => ({
            name: item.name,
            qty: item.quantity || 1,
            rate: item.price,
            total: (item.quantity || 1) * item.price
        }));
        const total = items.reduce((sum, i) => sum + i.total, 0);

        // 4. Due date (14 days from now)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        // 5. Save invoice
        const invoiceRef = await db.collection('invoices').add({
            invoiceNumber: invoiceNumber,
            parentUid: user.uid,
            parentName: parentName,
            parentEmail: user.email,
            parentPhone: parentPhone,
            items: items,
            subtotal: total,
            total: total,
            status: 'pending',
            paymentRef: paymentRef,
            issuedAt: new Date().toISOString(),
            dueAt: dueDate.toISOString(),
            paidAt: null
        });

        // 6. Build HTML invoice
        const itemsHtml = items.map(item => `
            <tr>
                <td style="padding:10px; border-bottom:1px solid #eee;">${item.name}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${item.qty}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">R${item.rate.toFixed(2)}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">R${item.total.toFixed(2)}</td>
            </tr>
        `).join('');

        const invoiceHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto;">
                <div style="background: #1e2a3a; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">AceEd Tutoring</h1>
                    <p style="color: #f39c12; margin: 5px 0 0;">✦ Affordable Services ✦</p>
                </div>
                <div style="padding: 25px; background: #f9f9f9;">
                    <h2 style="margin-top:0;">Invoice ${invoiceNumber}</h2>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
                       <strong>Due:</strong> ${dueDate.toLocaleDateString()}</p>
                    <hr>
                    <p><strong>Billed to:</strong><br>
                       ${parentName}<br>
                       ${user.email}<br>
                       ${parentPhone}</p>
                    <hr>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <thead>
                            <tr style="background: #1e2a3a; color: white;">
                                <th style="padding:10px; text-align:left;">Description</th>
                                <th style="padding:10px; text-align:center;">Qty</th>
                                <th style="padding:10px; text-align:right;">Rate</th>
                                <th style="padding:10px; text-align:right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" style="padding:12px; text-align:right; font-weight:bold;">TOTAL DUE:</td>
                                <td style="padding:12px; text-align:right; font-weight:bold; color:#27ae60; font-size:1.2rem;">R${total.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <hr style="margin: 25px 0;">
                    <h3>Payment Instructions</h3>
                    <p><strong>Bank:</strong> Standard Bank<br>
                       <strong>Account Holder:</strong> AceEd Tutoring (K2026179832)<br>
                       <strong>Account Number:</strong> 10271792580<br>
                       <strong>Branch Code:</strong> 000610<br>
                       <strong>PayShap ID:</strong> +27-655294232@standardbank<br>
                       <strong>Payment Reference:</strong> <span style="background:#fff3cd; padding:3px 8px; border-radius:4px;">${paymentRef}</span></p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://aceed.co.za/confirm-payment.html?invoice=${invoiceRef.id}" 
                           style="background: #27ae60; color: white; padding: 14px 35px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">
                           ✅ I've Made Payment
                        </a>
                    </div>
                    <p style="font-size: 0.85rem; color: #666;">Questions? Reply to this email or WhatsApp us at +27 65 529 4232.</p>
                </div>
                <div style="background: #0f1720; color: #a0aec0; padding: 15px; text-align: center; font-size: 12px;">
                    <p style="margin:0;">© 2026 AceEd Tutoring</p>
                </div>
            </div>
        `;

        // 7. Email → Parent
        await db.collection('mail').add({
            to: user.email,
            message: {
                subject: 'Invoice ' + invoiceNumber + ' - AceEd Tutoring',
                html: invoiceHtml
            }
        });

        // 8. Email → Admin
        await db.collection('mail').add({
            to: 'admin@aceed.co.za',
            message: {
                subject: 'New Invoice: ' + invoiceNumber + ' (' + parentName + ')',
                html: `
                    <h2>New Invoice Request</h2>
                    <p><strong>Invoice:</strong> ${invoiceNumber}</p>
                    <p><strong>Parent:</strong> ${parentName}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Total:</strong> R${total.toFixed(2)}</p>
                    <p><strong>Reference:</strong> ${paymentRef}</p>
                    <p><a href="https://aceed.co.za/admin.html">View in Admin Dashboard</a></p>
                `
            }
        });

        // 9. Clear cart
        clearCart();

        alert('✅ Invoice ' + invoiceNumber + ' sent to ' + user.email + '!\n\nCheck your inbox for payment instructions.');
        window.location.href = 'parent-dashboard.html';

    } catch (error) {
        console.error('Error generating invoice:', error);
        alert('Error: ' + error.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-file-invoice"></i> Request Invoice';
        }
    }
}

// ------------------------------------------------------------
// Wire up .add-to-cart buttons
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    updateCartBadge();

    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function() {
            const item = {
                id: this.dataset.id || Date.now().toString(),
                name: this.dataset.item || this.dataset.name || 'Service',
                price: parseFloat(this.dataset.price) || 0,
                type: this.dataset.type || 'service'
            };
            addToCart(item);

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
