export const TRANSITIONS = {
    // Heavy, "Engineered" feel for main layout elements
    heavy: {
        type: "spring",
        stiffness: 70,
        damping: 20,
        mass: 1.2
    },
    // Snappy, "Fast" feel for UI elements
    fast: {
        type: "spring",
        stiffness: 400,
        damping: 30
    },
    // Smooth, "Cinematic" feel for landing page
    smooth: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1] // Custom refined cubic-bezier
    }
};

export const VARIANTS = {
    // Page Container (Mount)
    page: {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                when: "beforeChildren"
            }
        },
        exit: { opacity: 0 }
    },

    // Section / Card Entry (Slight upward drift)
    card: {
        hidden: { opacity: 0, y: 30 },
        show: {
            opacity: 1,
            y: 0,
            transition: TRANSITIONS.heavy
        }
    },

    // List Items (Fast, tight stagger)
    row: {
        hidden: { opacity: 0, x: -10 },
        show: {
            opacity: 1,
            x: 0,
            transition: TRANSITIONS.fast
        }
    },

    // Headers (Heavy, authoritative)
    header: {
        hidden: { opacity: 0, y: -20 },
        show: {
            opacity: 1,
            y: 0,
            transition: TRANSITIONS.heavy
        }
    },

    // Container Helper
    container: {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
            }
        }
    }
};

// Hook-compatible export for simpler imports if needed
export const motionConfig = {
    initial: "hidden",
    animate: "show",
    viewport: { once: true, margin: "-50px" }
};
