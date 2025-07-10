// RatingSystem class for handling student ratings
class RatingSystem {
    constructor() {
        this.ratings = {};
        this.userRatings = {};
        this.supabase = supabase;
        this.init();
    }

    async init() {
        await this.loadRatings();
        this.setupStarInputs();
        this.setupRatingForms();
    }

    async loadRatings() {
        try {
            const { data: ratings, error } = await this.supabase
                .from('ratings')
                .select('*');

            if (error) throw error;

            // Process ratings data
            const processedRatings = {};
            ratings.forEach(rating => {
                if (!processedRatings[rating.student_id]) {
                    processedRatings[rating.student_id] = {
                        total: 0,
                        count: 0,
                        average: 0,
                        lastUpdated: 0
                    };
                }
                processedRatings[rating.student_id].total += rating.rating;
                processedRatings[rating.student_id].count += 1;
                processedRatings[rating.student_id].average = 
                    processedRatings[rating.student_id].total / processedRatings[rating.student_id].count;
                processedRatings[rating.student_id].lastUpdated = 
                    Math.max(processedRatings[rating.student_id].lastUpdated, new Date(rating.created_at).getTime());
            });

            this.ratings = processedRatings;
            this.updateAllRatingDisplays();
        } catch (error) {
            console.error('Error loading ratings:', error);
        }
    }

    setupStarInputs() {
        document.querySelectorAll('.stars-input').forEach(container => {
            const studentId = container.getAttribute('data-student');
            
            // Create 5 star inputs
            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('span');
                star.className = 'star-input';
                star.textContent = '★';
                star.setAttribute('data-rating', i);
                
                star.addEventListener('mouseenter', () => {
                    this.highlightStars(container, i);
                });
                
                star.addEventListener('click', () => {
                    this.selectRating(container, i, studentId);
                });
                
                container.appendChild(star);
            }
            
            container.addEventListener('mouseleave', () => {
                this.resetStarHighlight(container, studentId);
            });
        });
    }

    setupRatingForms() {
        document.querySelectorAll('.submit-rating').forEach(button => {
            button.addEventListener('click', (e) => {
                const card = e.target.closest('.feature-card');
                const studentId = card.getAttribute('data-student');
                const emailInput = card.querySelector('.email-input');
                const starContainer = card.querySelector('.stars-input');
                const selectedRating = starContainer.getAttribute('data-selected') || 0;
                
                this.submitRating(studentId, selectedRating, emailInput.value, card);
            });
        });
    }

    highlightStars(container, rating) {
        const stars = container.querySelectorAll('.star-input');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    selectRating(container, rating, studentId) {
        container.setAttribute('data-selected', rating);
        this.highlightStars(container, rating);
    }

    resetStarHighlight(container, studentId) {
        const selectedRating = container.getAttribute('data-selected') || 0;
        this.highlightStars(container, selectedRating);
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async submitRating(studentId, rating, email, card) {
        const messageEl = card.querySelector('.rating-message');
        const button = card.querySelector('.submit-rating');
        
        // Validation
        if (!rating || rating === '0') {
            this.showMessage(messageEl, 'Please select a rating', 'error');
            return;
        }
        
        if (!email || !this.validateEmail(email)) {
            this.showMessage(messageEl, 'Please enter a valid email address', 'error');
            return;
        }
        
        // Check if user already rated this student
        const { data: existingRating } = await this.supabase
            .from('ratings')
            .select('*')
            .eq('student_id', studentId)
            .eq('user_email', email)
            .single();

        if (existingRating) {
            this.showMessage(messageEl, 'You have already rated this student', 'error');
            return;
        }
        
        // Disable button during submission
        button.disabled = true;
        button.textContent = 'Submitting...';
        
        try {
            // Insert new rating
            const { error } = await this.supabase
                .from('ratings')
                .insert([
                    {
                        student_id: studentId,
                        user_email: email,
                        rating: parseInt(rating)
                    }
                ]);

            if (error) throw error;

            // Reload ratings and update display
            await this.loadRatings();
            
            // Reload the page
            window.location.reload();
        } catch (error) {
            console.error('Error submitting rating:', error);
            this.showMessage(messageEl, 'Error submitting rating', 'error');
            button.disabled = false;
            button.textContent = 'Rate';
        }
    }

    updateAllRatingDisplays() {
        document.querySelectorAll('[data-student]').forEach(card => {
            const studentId = card.getAttribute('data-student');
            this.updateRatingDisplay(studentId);
        });
    }

    updateRatingDisplay(studentId) {
        const card = document.querySelector(`[data-student="${studentId}"]`);
        const starsDisplay = card.querySelector('.stars-display');
        const ratingText = card.querySelector('.rating-text');
        
        const rating = this.ratings[studentId];
        if (rating && rating.count > 0) {
            const avgRating = Math.round(rating.average);
            
            // Update stars
            starsDisplay.innerHTML = '';
            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('span');
                star.className = i <= avgRating ? 'star-display' : 'star-display empty';
                star.textContent = '★';
                starsDisplay.appendChild(star);
            }
            
            // Update text
            ratingText.textContent = `(${rating.count} rating${rating.count !== 1 ? 's' : ''}) - ${rating.average.toFixed(1)}/5`;
        }
    }

    getStudentName(studentId) {
        const card = document.querySelector(`[data-student="${studentId}"]`);
        return card ? card.querySelector('a').textContent : studentId;
    }

    getStudentLink(studentId) {
        const card = document.querySelector(`[data-student="${studentId}"]`);
        return card ? card.querySelector('a').href : '#';
    }

    showMessage(element, message, type) {
        element.textContent = message;
        element.className = `rating-message ${type}`;
        element.style.display = 'block';
        
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
}

// Initialize Rating System when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.ratingSystem = new RatingSystem();
}); 