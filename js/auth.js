// Initialize Supabase client
const supabaseUrl = 'https://aejwkngddlfukcrqzzop.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlandrbmdkZGxmdWtjcnF6em9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MjExNDgsImV4cCI6MjA2NTE5NzE0OH0.cMSkE_-Mewygt83AT3lgcxIcbEbrNq-4JS0Sa6AjiJw';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.session = null;
        this.init();
    }

    async init() {
        try {
            // Check for existing session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
            
            if (session) {
                // Check if email is verified
                if (!session.user.email_confirmed_at) {
                    await this.signOut();
                    window.location.href = 'auth.html?message=Please verify your email first';
                    return;
                }

                this.session = session;
                this.currentUser = session.user;
                this.updateUIForLoggedInUser();
            }

            // Listen for auth state changes
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state changed:', event, session);
                
                if (event === 'SIGNED_IN') {
                    // Check if email is verified
                    if (!session.user.email_confirmed_at) {
                        await this.signOut();
                        window.location.href = 'auth.html?message=Please verify your email first';
                        return;
                    }

                    this.session = session;
                    this.currentUser = session.user;
                    this.updateUIForLoggedInUser();
                    window.location.href = 'dashboard.html';
                } else if (event === 'SIGNED_OUT') {
                    this.session = null;
                    this.currentUser = null;
                    this.updateUIForLoggedOutUser();
                    window.location.href = 'index.html';
                }
            });
        } catch (error) {
            console.error('Error in auth init:', error);
        }
    }

    async signUp(email, password) {
        try {
            console.log('Attempting to sign up:', email);
            
            // Proceed with signup
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth.html`,
                    data: {
                        email: email,
                        created_at: new Date().toISOString()
                    }
                }
            });

            if (error) {
                console.error('Signup error:', error);
                throw error;
            }

            console.log('Signup successful:', data);

            return {
                success: true,
                message: 'Please check your email for verification link'
            };
        } catch (error) {
            console.error('Signup error:', error);
            return {
                success: false,
                message: error.message || 'An error occurred during signup'
            };
        }
    }

    async signIn(email, password) {
        try {
            console.log('Attempting to sign in:', email);
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error('Sign in error:', error);
                throw error;
            }

            // Check if email is verified
            if (!data.user.email_confirmed_at) {
                await this.signOut();
                return {
                    success: false,
                    message: 'Please verify your email before signing in'
                };
            }

            console.log('Sign in successful:', data);

            return {
                success: true,
                message: 'Successfully signed in'
            };
        } catch (error) {
            console.error('Sign in error:', error);
            return {
                success: false,
                message: error.message || 'An error occurred during sign in'
            };
        }
    }

    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            this.session = null;
            this.currentUser = null;
            this.updateUIForLoggedOutUser();
            return {
                success: true,
                message: 'Successfully signed out'
            };
        } catch (error) {
            console.error('Sign out error:', error);
            return {
                success: false,
                message: error.message || 'An error occurred during sign out'
            };
        }
    }

    async verifyOTP(email, token) {
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'email'
            });

            if (error) throw error;

            return {
                success: true,
                message: 'Email verified successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    async resendOTP(email) {
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email
            });

            if (error) throw error;

            return {
                success: true,
                message: 'Verification email resent'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    updateUIForLoggedInUser() {
        // Show/hide elements based on auth state
        document.querySelectorAll('.auth-required').forEach(el => {
            el.style.display = 'block';
        });
        document.querySelectorAll('.auth-not-required').forEach(el => {
            el.style.display = 'none';
        });

        // Update user email display
        const userEmailElements = document.querySelectorAll('.user-email');
        userEmailElements.forEach(el => {
            el.textContent = this.currentUser?.email || '';
        });
    }

    updateUIForLoggedOutUser() {
        // Show/hide elements based on auth state
        document.querySelectorAll('.auth-required').forEach(el => {
            el.style.display = 'none';
        });
        document.querySelectorAll('.auth-not-required').forEach(el => {
            el.style.display = 'block';
        });

        // Clear user email display
        const userEmailElements = document.querySelectorAll('.user-email');
        userEmailElements.forEach(el => {
            el.textContent = '';
        });
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getSession() {
        return this.session;
    }
}

// Initialize auth system
const authSystem = new AuthSystem();

// Add sign out handler
document.addEventListener('DOMContentLoaded', () => {
    const signOutButton = document.getElementById('signOut');
    if (signOutButton) {
        signOutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await authSystem.signOut();
        });
    }

    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message) {
        const authMessage = document.getElementById('authMessage');
        if (authMessage) {
            authMessage.textContent = message;
            authMessage.style.display = 'block';
            authMessage.className = 'auth-message error';
        }
    }
});

class RatingSystem {
  constructor() {
    this.auth = new AuthSystem()
    this.init()
  }

  init() {
    this.setupStarInputs()
    this.setupRatingForms()
    this.loadRatings()
    this.setupRealtimeSubscription()
  }

  setupStarInputs() {
    document.querySelectorAll('.stars-input').forEach(container => {
      const studentId = container.getAttribute('data-student')
      
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span')
        star.className = 'star-input'
        star.textContent = '★'
        star.setAttribute('data-rating', i)
        
        star.addEventListener('mouseenter', () => {
          this.highlightStars(container, i)
        })
        
        star.addEventListener('click', () => {
          this.selectRating(container, i, studentId)
        })
        
        container.appendChild(star)
      }
      
      container.addEventListener('mouseleave', () => {
        this.resetStarHighlight(container, studentId)
      })
    })
  }

  setupRatingForms() {
    document.querySelectorAll('.submit-rating').forEach(button => {
      button.addEventListener('click', async (e) => {
        if (!this.auth.currentUser) {
          this.showMessage(e.target.closest('.feature-card').querySelector('.rating-message'), 
            'Please sign in to rate', 'error')
          return
        }

        const card = e.target.closest('.feature-card')
        const studentId = card.getAttribute('data-student')
        const starContainer = card.querySelector('.stars-input')
        const selectedRating = starContainer.getAttribute('data-selected') || 0
        
        await this.submitRating(studentId, selectedRating, card)
      })
    })
  }

  async submitRating(studentId, rating, card) {
    const messageEl = card.querySelector('.rating-message')
    const button = card.querySelector('.submit-rating')
    
    if (!rating || rating === '0') {
      this.showMessage(messageEl, 'Please select a rating', 'error')
      return
    }
    
    button.disabled = true
    button.textContent = 'Submitting...'
    
    try {
      const { data, error } = await supabase
        .from('ratings')
        .upsert({
          user_id: this.auth.currentUser.id,
          student_id: studentId,
          rating: parseInt(rating)
        })
        .select()

      if (error) throw error

      this.showMessage(messageEl, 'Thank you for your rating!', 'success')
      this.updateRatingDisplay(studentId)
      
      // Clear form
      card.querySelector('.stars-input').setAttribute('data-selected', '0')
      this.resetStarHighlight(card.querySelector('.stars-input'), studentId)
    } catch (error) {
      this.showMessage(messageEl, error.message, 'error')
    } finally {
      button.disabled = false
      button.textContent = 'Rate'
    }
  }

  setupRealtimeSubscription() {
    // Subscribe to changes in the ratings table
    supabase
      .channel('ratings_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'ratings' 
        }, 
        (payload) => {
          // Reload ratings when there's a change
          this.loadRatings()
        }
      )
      .subscribe()
  }

  async loadRatings() {
    try {
      const { data: ratings, error } = await supabase
        .from('ratings')
        .select('student_id, rating')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Group ratings by student
      const studentRatings = ratings.reduce((acc, curr) => {
        if (!acc[curr.student_id]) {
          acc[curr.student_id] = { total: 0, count: 0 }
        }
        acc[curr.student_id].total += curr.rating
        acc[curr.student_id].count += 1
        return acc
      }, {})

      // Update UI for each student
      Object.entries(studentRatings).forEach(([studentId, data]) => {
        const avgRating = data.total / data.count
        this.updateRatingDisplay(studentId, avgRating, data.count)
      })
    } catch (error) {
      console.error('Error loading ratings:', error)
    }
  }

  updateRatingDisplay(studentId, avgRating = 0, count = 0) {
    const card = document.querySelector(`[data-student="${studentId}"]`)
    if (!card) return

    const starsDisplay = card.querySelector('.stars-display')
    const ratingText = card.querySelector('.rating-text')
    
    // Update stars
    starsDisplay.innerHTML = ''
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('span')
      star.className = i <= avgRating ? 'star-display' : 'star-display empty'
      star.textContent = '★'
      starsDisplay.appendChild(star)
    }
    
    // Update text
    ratingText.textContent = `(${count} rating${count !== 1 ? 's' : ''}) - ${avgRating.toFixed(1)}/5`
  }

  highlightStars(container, rating) {
    const stars = container.querySelectorAll('.star-input')
    stars.forEach((star, index) => {
      if (index < rating) {
        star.classList.add('active')
      } else {
        star.classList.remove('active')
      }
    })
  }

  selectRating(container, rating, studentId) {
    container.setAttribute('data-selected', rating)
    this.highlightStars(container, rating)
  }

  resetStarHighlight(container, studentId) {
    const selectedRating = container.getAttribute('data-selected') || 0
    this.highlightStars(container, selectedRating)
  }

  showMessage(element, message, type) {
    element.textContent = message
    element.className = `rating-message ${type}`
    element.style.display = 'block'
    
    setTimeout(() => {
      element.style.display = 'none'
    }, 3000)
  }
}

// Initialize Rating System
const ratingSystem = new RatingSystem() 