API parameters
==============

The complete reference of transformation parameters recognized by the Media Processing API.

For consistency, [transformations](https://developer.frontify.com/r/AkQzCorKoslp_NN0NoS4YYTnnghWjfcQiynuULA2QOA) use the same format for parameters representing similar underlying concepts.

anchor
------

An anchor represents a border or a corner of an image.

The following literals are accepted:

*   bottom
    
*   bottom-left
    
*   bottom-right
    
*   left
    
*   top
    
*   top-left
    
*   top-right
    
*   right
    

angle
-----

An angle represents... an angle.

It can be a [number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ), in which case it's rounded to the nearest multiple of 90 and represents an angle expressed in degrees.

The following literals are also accepted:

| Literal | Angle |
| --- | --- |
| `anticlockwise` | \-90° |
| `clockwise` | 90° |
| `counterclockwise` | \-90° |
| `flip` | 180° |
| `left` | \-90° |
| `reverse` | 180° |
| `right` | 90° |

axis
----

An axis represents the horizontal axis, the vertical axis or both.

The following literals are accepted:

| Literal | Axis |
| --- | --- |
| `both` | both |
| `h` | horizontal |
| `horizontal` | horizontal |
| `v` | vertical |
| `vertical` | vertical |
| `x` | horizontal |
| `y` | vertical |

boolean
-------

A boolean represents... a boolean value (true or false).

The following literals are accepted:

| Literal | Boolean |
| --- | --- |
| `false` | false |
| `no` | false |
| `off` | false |
| `true` | true |
| `yes` | true |
| `on` | true |

color
-----

A color represents... a color! It can be specified as:

*   a standard named color like red or green (see [this comprehensive list](https://developer.mozilla.org/en-US/docs/Web/CSS/named-color)),
    
*   a three-character hexadecimal value like 76E for RGB colors with no alpha,
    
*   a four-character hexadecimal value like 76E8 for RGB colors with alpha,
    
*   a six-character hexadecimal value like A68040 for RGB colors with no alpha,
    
*   an eight-character hexadecimal value like A6804080 for RGB colors with alpha,
    
*   a CSS-like RGB expression: rgb(<red>,<green>,<blue>),
    
*   a CSS-like RGBA expression: rgba(<red>,<green>,<blue>,<alpha>),
    
*   a CSS-like HSL expression: hsl(<hue>,<saturation>,<lightness>),
    
*   a CSS like HSLA expression: hsla(<hue>,<saturation>,<lightness>,<alpha>).
    

The Media Processing service also adds transparent so that you can easily create an invisible placeholder using placeholder:transparent.

Finally, you also can add an alpha value to color names, three-character hexadecimal colors, and six-character hexadecimal colors. Simply append the decimal part of the alpha component to the color expression.

| Examples |
| --- |
| violet.25 |
| 008.75 |
| 808080.3 |

coordinates
-----------

coordinates represent a point in an image, specified as a couple of positive [lengths](https://developer.frontify.com/r/zj0HmY5L9QnVXdB8eeqT_pE-HAwzViwOZsU8ncAWfyQ) separated by the character x:

*   the first length is the coordinate along the x-axis (following the width of the image)
    
*   the second length is the coordinate along the y-axis (following the height of the image)
    

The Media Processing service uses CSS's coordinate system: zero-based, left-to-right, and top-to-bottom.

If we take the example of an image that is 640 pixel-wide and 480 pixel-high:

*   0x0 points to the top-left corner pixel
    
*   639x479 points to the bottom-right corner pixel.
    

info

It is perfectly fine to mix lengths of different units in the same coordinates . For instance, in the context of yet another 640 per 480 sample image, coordinates 100x50p actually translate to 100x240.

crop size
---------

A crop size is a [size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY) where omitted dimensions are assumed to be the same as the input image.

For instance:

*   320 and 320x- are equivalent to 320x1s
    
*   \-x240 is equivalent to 1sx240
    

length
------

length is equivalent to CSS length values. It consists of a [number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ) eventually followed by a unit specifier:

*   when no unit is specified, the length is in pixels; for instance, 50 is a pixel length that can be read as "50 pixels"
    
*   with the unit specifier "s", the length is a scale; for instance (1/3)s is a scale length that can be read as "one-third"
    
*   with the unit specifier "p", the length is a percentage; for instance, 4.5p is a percentage length representing "4.5%"
    

number
------

number can be JSON-encoded number literals or expressions that, when computed, result in an actual number. Expressions are embedded in parentheses. Operators +, \-, \*, and / are supported for additions, subtractions, multiplications, and divisions, respectively. Classic algebraic precedence is respected, and parenthesis can be used to circumvent it.

For instance, 50, 7.2, (1/3), (5\*(7+2)/3) are all valid numbers.

padding
-------

A padding is a list of comma-separated [lengths](https://developer.frontify.com/r/zj0HmY5L9QnVXdB8eeqT_pE-HAwzViwOZsU8ncAWfyQ) that follows the CSS convention:

*   <top>,<right>,<bottom>,<left>
    
*   <top>,<horizontal>,<bottom>
    
*   <vertical>,<horizontal>
    
*   <both>
    

For instance, 10,100,23,47, 0,25p, (1/3)s are all valid paddings.

ratio
-----

A ratio represents the proportional relationship between a width and a height. It's specified as a couple of strictly positive [numbers](https://www.twicpics.com/docs/reference/parameters#number) separated by the character ::

*   the first number is the number of length units contained in the width
    
*   the second number is the number of length units contained in the height
    

For instance, the ratio 9:3 indicates that the width is 9-units long while the height is 3-units long. In terms of proportions, the width is (9/3=)3 times longer than the height.

size
----

A size represents a 2D area, specified as a couple of strictly positive [lengths](https://developer.frontify.com/r/zj0HmY5L9QnVXdB8eeqT_pE-HAwzViwOZsU8ncAWfyQ#length) separated by the character x:

*   the first length is the width of the area
    
*   the second length is the height of the area
    

For instance, 640x480 is 640 pixel-wide per 480 pixel-high.

It's possible to omit one of the dimensions using the character \-. In that case, the Media Processing service will automatically compute the missing dimension so that its size respects the aspect ratio of the source image. For instance, if the source image is 640 pixel-wide per 480 pixel-high, then sizes 320x- and \-x240 are both equivalent to 320x240.

As a shortcut, it's possible to omit the height by specifying just a width. For instance, the size 320 is equivalent to 320x-.