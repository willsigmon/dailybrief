# Design System - Daily Intelligence Briefing

## Color Palette

### Primary Gradients
```css
/* Indigo to Purple - Primary Brand */
from-indigo-600 to-purple-600
from-indigo-500 to-purple-600

/* Alert Categories */
Urgent: from-red-500 to-rose-600
Important: from-amber-500 to-yellow-600
Strategic: from-emerald-500 to-green-600
Calendar: from-blue-500 to-cyan-600
Relationship: from-purple-500 to-indigo-600
LLM Analysis: from-pink-500 to-rose-600

/* Stepped Gradients (How It Works) */
Step 1: from-indigo-500 to-purple-600
Step 2: from-purple-500 to-pink-600
Step 3: from-pink-500 to-rose-600
```

### Background Colors
```css
/* Card Backgrounds (with gradients) */
Urgent: from-red-50 to-rose-50
Important: from-amber-50 to-yellow-50
Strategic: from-emerald-50 to-green-50
Calendar: from-purple-50 to-indigo-50
Relationship: from-indigo-50 to-purple-50
```

### Glass Effect
```css
background: rgba(255, 255, 255, 0.7)
backdrop-filter: blur(10px)
border: 1px solid rgba(255, 255, 255, 0.18)
```

## Typography

### Headings
```css
/* Main Page Title */
text-2xl sm:text-3xl font-bold
bg-gradient-to-r from-indigo-600 to-purple-600
bg-clip-text text-transparent

/* Welcome Hero */
text-4xl sm:text-5xl font-bold
bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600

/* Section Titles */
text-xl font-bold (or CardTitle component)

/* Card Headings */
text-base font-semibold
```

### Body Text
```css
/* Description Text */
text-gray-600 leading-relaxed

/* Label Text */
text-sm text-gray-600

/* Small Text */
text-xs text-gray-500
```

## Spacing System

### Container Padding
```css
/* Mobile */
px-4 py-4

/* Tablet */
sm:px-6

/* Desktop */
lg:px-8

/* Vertical Spacing */
py-8 (main content)
py-12 (hero sections)
```

### Card Spacing
```css
/* Between cards */
mb-4 (standard)
mb-6 (emphasized)
mb-16 (section breaks)

/* Inside cards */
p-4 (standard)
p-3 (nested)
```

## Component Patterns

### Card Structure
```tsx
<Card className="glass shadow-lg card-hover border-l-4 border-l-{color}-500">
  <CardHeader className="cursor-pointer hover:bg-white/50 transition-all duration-200">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-gradient-to-br from-{color}-500 to-{color}-600 rounded-lg shadow-md">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <CardTitle>Title</CardTitle>
      <Badge>Count</Badge>
    </div>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
</Card>
```

### Alert Item Pattern
```tsx
<div className="flex items-start gap-3 p-4 bg-gradient-to-br from-{color}-50 to-{color2}-50 rounded-xl border border-{color}-200 shadow-sm hover:shadow-md transition-all duration-200">
  <Checkbox className="mt-1 border-{color}-300" />
  <div className="flex-1">
    <h4 className="font-semibold text-base">Title</h4>
    <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
      <Icon className="h-3 w-3" />
      Contact Info
    </p>
    <p className="text-sm text-gray-700 mt-2 leading-relaxed">
      Description
    </p>
  </div>
</div>
```

### Icon Container Pattern
```tsx
<div className="p-2 bg-gradient-to-br from-{color}-500 to-{color}-600 rounded-lg shadow-md">
  <Icon className="h-5 w-5 text-white" />
</div>

/* Large version */
<div className="p-3 bg-gradient-to-br from-{color}-500 to-{color}-600 rounded-xl shadow-md">
  <Icon className="w-6 h-6 text-white" />
</div>
```

### Badge Variants
```tsx
/* Urgent */
<Badge variant="destructive" className="shadow-sm">

/* Important/Strategic */
<Badge variant="secondary" className="bg-{color}-100 text-{color}-900 shadow-sm">
```

## Icons

### Icon Sizes
```css
h-3 w-3 - Small inline icons
h-4 w-4 - Standard inline icons  
h-5 w-5 - Card header icons
h-6 w-6 - Feature card icons
w-10 h-10 - Large hero icons
w-12 h-12 - Extra large hero icons
```

### Icon Colors
```css
/* In gradient containers */
text-white

/* Standalone */
text-{color}-500 or text-{color}-600

/* Muted */
text-gray-500
```

## Animations

### Standard Transitions
```css
transition-all duration-200 - Fast interactions
transition-all duration-300 - Standard interactions
transition-transform - Transform-only (better performance)
```

### Hover Effects
```css
/* Cards */
hover:shadow-md
hover:bg-white/50
card-hover (includes transform + shadow)

/* Buttons */
hover:from-{color}-700 hover:to-{color2}-700
hover:shadow-xl

/* Icons in lists */
group-hover:scale-110
```

### Entrance Animations
```css
fade-in - Standard content fade in
animate-blob - Background blob animation
animation-delay-2000 - Stagger blob animations
animation-delay-4000
```

## Shadows

### Shadow Hierarchy
```css
shadow-sm - Subtle element depth
shadow-md - Standard card elevation
shadow-lg - Important cards
shadow-xl - Hero elements, CTAs
shadow-2xl - Modal/Dialog depth
```

## Borders

### Border Widths
```css
border - 1px standard
border-l-4 - Left accent bar
```

### Border Colors
```css
border-{color}-200 - Standard borders
border-{color}-300 - Emphasized borders
border-white/30 - Glass effect borders
```

## Responsive Breakpoints

```css
/* Mobile first */
Base styles apply to mobile

/* Tablet */
sm:* - min-width: 640px

/* Desktop */
lg:* - min-width: 1024px
```

### Responsive Patterns
```css
/* Flex direction */
flex-col sm:flex-row

/* Grid */
grid sm:grid-cols-2 lg:grid-cols-4

/* Visibility */
hidden sm:block

/* Spacing */
px-4 sm:px-6 lg:px-8

/* Text size */
text-2xl sm:text-3xl lg:text-4xl
```

## Accessibility

### Focus States
```css
outline-ring/50 - Applied globally
```

### Color Contrast
- All text meets WCAG AA standards
- Gradient backgrounds have sufficient contrast
- Interactive elements clearly distinguishable

### Motion
```css
/* Consider adding in future */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Usage Guidelines

### Do's
✅ Use gradient backgrounds for icon containers
✅ Apply glass effect to major cards and headers
✅ Use shadow hierarchy to show importance
✅ Maintain consistent spacing (gap-3, gap-4, gap-6)
✅ Apply hover effects to interactive elements
✅ Use semantic color coding (red=urgent, amber=important, green=strategic)

### Don'ts
❌ Mix flat and gradient styles in same section
❌ Use more than 3 colors in a single component
❌ Apply glass effect to small elements
❌ Use heavy shadows on all elements
❌ Override the card-hover behavior
❌ Use inconsistent border radius

## Future Enhancements

### Dark Mode
- Add `.dark` variants for all components
- Use glass-dark class for dark mode glass effect
- Adjust gradient opacity for dark backgrounds

### Themes
- Allow users to choose accent color
- Maintain same design patterns with custom colors
- Use CSS variables for easy theme switching

### Accessibility
- Add reduced motion support
- Improve keyboard navigation
- Add ARIA labels where needed
- Test with screen readers
