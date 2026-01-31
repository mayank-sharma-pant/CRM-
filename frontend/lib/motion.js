/**
 * Motion Configuration - Editorial Style
 * 
 * Subtle, refined animations that support reading flow.
 * No heavy springs, no flashy effects.
 */

// Gentle transitions for editorial feel
export const TRANSITIONS = {
    // Default smooth transition
    gentle: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1], // Smooth ease-out
    },
    // Slightly delayed for reveals
    delayed: {
        duration: 0.6,
        delay: 0.1,
        ease: [0.25, 0.1, 0.25, 1],
    },
    // Fast for UI interactions
    fast: {
        duration: 0.2,
        ease: [0.25, 0.1, 0.25, 1],
    },
    // For page transitions
    page: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
    },
};

// Animation variants - minimal, elegant
export const VARIANTS = {
    // Page container
    page: {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                duration: 0.3,
                staggerChildren: 0.08,
                when: "beforeChildren",
            },
        },
        exit: { opacity: 0, transition: { duration: 0.2 } },
    },

    // Fade up - primary entrance animation
    fadeUp: {
        hidden: { opacity: 0, y: 12 },
        show: {
            opacity: 1,
            y: 0,
            transition: TRANSITIONS.gentle,
        },
    },

    // Fade in - simple opacity
    fadeIn: {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: TRANSITIONS.gentle,
        },
    },

    // For cards and sections
    card: {
        hidden: { opacity: 0, y: 16 },
        show: {
            opacity: 1,
            y: 0,
            transition: TRANSITIONS.gentle,
        },
    },

    // For list items - minimal slide
    row: {
        hidden: { opacity: 0, x: -8 },
        show: {
            opacity: 1,
            x: 0,
            transition: TRANSITIONS.fast,
        },
    },

    // Headers - subtle down motion
    header: {
        hidden: { opacity: 0, y: -8 },
        show: {
            opacity: 1,
            y: 0,
            transition: TRANSITIONS.gentle,
        },
    },

    // Container for staggered children
    container: {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.05,
            },
        },
    },

    // Stagger helper for custom use
    stagger: {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.06,
            },
        },
    },
};

// Viewport options for scroll-triggered animations
export const VIEWPORT = {
    once: true,
    margin: "-10%",
    amount: 0.3,
};

// Simple config export for common patterns
export const motionConfig = {
    initial: "hidden",
    animate: "show",
    exit: "exit",
    viewport: VIEWPORT,
};

// Hover animations - minimal
export const HOVER = {
    lift: {
        y: -2,
        transition: TRANSITIONS.fast,
    },
    scale: {
        scale: 1.02,
        transition: TRANSITIONS.fast,
    },
};
