// Animation Variants for Landing Page
// Framer Motion configuration with intentional timing hierarchy

// Custom easing curves
export const easings = {
    smooth: [0.22, 1, 0.36, 1], // Custom bezier for smooth, premium feel
    easeOut: [0.16, 1, 0.3, 1],
    spring: { type: "spring", stiffness: 100, damping: 15 }
};

// Timing constants
export const durations = {
    hero: {
        headline: 0.8,
        subheadline: 0.6,
        cta: 0.4,
        dashboard: 0.9
    },
    section: {
        header: 0.4,
        card: 0.35
    },
    micro: 0.2
};

// PRIMARY MOTION - Hero Section
export const heroVariants = {
    headline: {
        hidden: {
            opacity: 0,
            y: 20
        },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: durations.hero.headline,
                ease: easings.smooth
            }
        }
    },

    subheadline: {
        hidden: {
            opacity: 0,
            y: 20
        },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: durations.hero.subheadline,
                delay: 0.3,
                ease: easings.easeOut
            }
        }
    },

    cta: {
        hidden: {
            opacity: 0,
            scale: 0.96
        },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                duration: durations.hero.cta,
                delay: 0.6,
                ease: easings.easeOut
            }
        }
    },

    dashboard: {
        hidden: {
            opacity: 0,
            x: 70,
            scale: 0.97
        },
        visible: {
            opacity: 1,
            x: 0,
            scale: 1,
            transition: {
                duration: durations.hero.dashboard,
                ease: easings.easeOut
            }
        }
    }
};

// SECONDARY MOTION - Scroll-based sections
export const sectionVariants = {
    header: {
        hidden: {
            opacity: 0,
            y: 16
        },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: durations.section.header,
                ease: easings.easeOut
            }
        }
    }
};

// TERTIARY MOTION - Cards with stagger
export const cardVariants = {
    container: {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
            }
        }
    },

    item: {
        hidden: {
            opacity: 0,
            y: 24,
            scale: 0.95
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: durations.section.card,
                ease: easings.easeOut
            }
        }
    }
};

// MICRO-INTERACTIONS - Hover states
export const hoverVariants = {
    button: {
        rest: { scale: 1, y: 0 },
        hover: {
            scale: 1.02,
            y: -2,
            transition: { duration: durations.micro }
        },
        tap: { scale: 0.98, y: 0 }
    },

    card: {
        rest: { y: 0, scale: 1 },
        hover: {
            y: -6,
            scale: 1.01,
            transition: { duration: durations.micro }
        }
    },

    icon: {
        rest: { scale: 1, rotate: 0 },
        hover: {
            scale: 1.1,
            rotate: 6,
            transition: { duration: durations.micro }
        }
    }
};

// Viewport configuration for scroll animations
export const viewportConfig = {
    once: true,
    amount: 0.3,
    margin: "-50px"
};
