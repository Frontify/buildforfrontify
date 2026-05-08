API transformations
===================

The complete reference of media transformations supported by the Media Processing API.

There are two kinds of transformations: ones that modify the image and others that change the context of further transformations down the manipulation chain.

Syntax
------

All transformations follow the same structure: <name>=<parameters>

where:

*   <name> is the name of the transformation
    
*   <parameters> is an expression specifying the parameters for the transformation
    

For instance:

*   resize=400 will resize the image to 400 pixels in width while conserving the source image aspect ratio
    
*   resize=640x480 will resize the image to exactly 640 pixels in width per 480 pixels in height, potentially altering its aspect ratio
    

Fundamentals
------------

info

We refer to a list of one or several transformations as a manipulation.

Transformations can be chained together using the character /. The number of transformations you can chain is unlimited, save for the size limit of a URL enforced by your browser. No matter how complex the manipulation, the Media Processing service will optimize it for speed and accuracy on the fly.

### Focus point

Transformations behave differently depending on which point in the image is the main focus. The Media Processing API will do its best to keep this focus point as central as possible within the transformed image.

By default, the focus point is in the middle of the image, but you can change its coordinates using the focus transformation.

### Chaining transformations

When adding a transformation to the chain, the parameters given are interpreted as if previous transformations had already been performed (i.e., as if the source image was the result of the previous transformations).

For instance:

*   resize=340/resize=50p will result in an image that is 170 pixel-wide
    
*   resize=50p/focus=20x10 will put the focus point at coordinates 40x20 of the source image
    

Since the Media Processing API optimizes the manipulation, a transformation may shadow what came before it. For instance, resize=50p/resize=340 will result in an image that's 340 pixels wide.

* * *

List of transformations
-----------------------

achromatopsia
-------------

Syntax:

*   achromatopsia=<[number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ)\>
    
*   achro=<[number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ)\>
    
*   achromatopsia
    
*   achro
    

Corrects the colors of the image for color-blind people suffering from achromatopsia.

The [number](https://www.twicpics.com/docs/reference/parameters#number) provided must be between 0 and 1 and represents the degree of color blindness to correct for. If no [number](https://www.twicpics.com/docs/reference/parameters#number) is provided then 1 (full-color blindness) is assumed.

none

achromatopsia=0.5

achromatopsia

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

* * *

background
----------

Syntax: background=<[color](https://developer.frontify.com/r/4P9SPj8z0dLsHAWIpTOK2TxrLTCrq2ZIfl-SD77auxs)\[+[color](https://developer.frontify.com/r/4P9SPj8z0dLsHAWIpTOK2TxrLTCrq2ZIfl-SD77auxs)\]\*>

background specifies a color, or a series of colors, that will show through transparent and translucent parts of the image.

The final background color will also fill the borders created by an inside transformation. This can be superseded by using the border transformation.

All types of [color values](https://developer.frontify.com/r/4P9SPj8z0dLsHAWIpTOK2TxrLTCrq2ZIfl-SD77auxs) are accepted (i.e., background=red, background=rgb(255,0,0), etc).

If multiple colors are specified and/or if multiple background transformations are specified, they are applied in order using [alpha compositing](https://en.wikipedia.org/wiki/Alpha_compositing). As a consequence, if, at one point, a color is opaque, any color and or background transformation thereafter will be ignored.

For instance, background=red.5+white will create a pinkish background, and so will background=red.5+white+black and background=red.5+white/background=black: the final black color will be ignored because white is opaque.

Note that background, border, and colorize are chainable.

In addition to color values, the keyword remove can also be used. When remove is found, all previous background colors will be canceled, and the Media Processing service will remove the image background using AI. Following that, you will have a translucent image and you're free to specify a new background color.

none

background=remove

background=remove+cyan

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

info

Please note that background=remove is still experimental and results are subject to change.

* * *

border
------

Syntax: border=<[color](https://developer.frontify.com/r/4P9SPj8z0dLsHAWIpTOK2TxrLTCrq2ZIfl-SD77auxs)\>

border specifies a color to fill borders eventually created by an inside transformation. It supersedes background in that instance and it is notably possible to ensure both a solid background and translucent borders by using border=transparent. border will have no effect on images that have no inside applied to them.

If multiple border transformations are specified, they're applied in order. If a border uses an opaque color, any border thereafter will be ignored.

Note that background, border and colorize are chainable.

* * *

colorize
--------

Syntax:

*   colorize=<[color for black](https://developer.frontify.com/r/4P9SPj8z0dLsHAWIpTOK2TxrLTCrq2ZIfl-SD77auxs)\>\[:<[color for white](https://developer.frontify.com/r/4P9SPj8z0dLsHAWIpTOK2TxrLTCrq2ZIfl-SD77auxs)\>\]
    
*   colorize=<color scheme>
    

Replaces colors in the image to create a gradient, replacing pure black with the first given color and pure white with the second given color.

none

colorize=black

colorize=black:cyan

colorize=cyan:black

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

There are also two available color schemes for your convenience:

*   monochrome to create a black-and-white image
    
*   sepia to create a sepia effect
    

colorize=monochrome

colorize=sepia

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

Note that background, border and colorize are chainable.

* * *

contain
-------

Syntax: contain=<[size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY)\>

contain behaves like the CSS background-size "contain". It will resize the image to fit inside the target area completely while conserving the original aspect ratio. The resulting image will be smaller than the target size, whose aspect ratio is not the same as the input's aspect ratio.

For instance, applying contain=150x100 to a 300x188 close-up of a cat will result in the following 150x94 image:

![cat-300](https://media.ffycdn.net/eu/developer-relations/f7UPZmPx1noewMizRyZb.jpg?width=150&format=webp&quality=100)

### contain-max

Syntax: contain-max=<[pixel size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY)\>

A conditional version of contain that will be applied only when one of the given lengths is smaller than the corresponding input image dimension.

### contain-min

Syntax: contain-min=<[pixel size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY)\>

A conditional version of contain that will be applied only when one of the given lengths is larger than the corresponding input image dimension.

* * *

cover
-----

Syntax: cover=<[size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY)|[ratio](https://developer.frontify.com/r/43X2RxwSL7Tma9sGHf3nd3BVKfKPM7DrF9qubN9XoVU)\>

cover behaves like the CSS background-size "cover". It resizes the image so that it completely fills the target area while conserving the original aspect ratio. If some parts of the image end up outside of the covered area, they are cropped.

So, a cover=100x100 of a 300x188 image would first scale the image down to a height of 100 pixels and then crop along the x-axis as demonstrated below:

![](https://media.ffycdn.net/eu/developer-relations/4h9ABxQnxTtfRVNobvHN.jpg?width=300&format=webp&quality=100)

Process

![](https://media.ffycdn.net/eu/developer-relations/PyuARYLgt5E6p3RwnJjn.jpeg?width=1000&format=webp&quality=100)

Result

cover will use the focus point as a guide and will crop the image so that the focus point is as central as possible in the resulting image. For instance, focus=85x85/cover=100x100 will behave as follows:

![cat-300-cover-focus-process](https://media.ffycdn.net/eu/developer-relations/55gyjWMAGxXePMZE1xsK.jpg?width=300&format=webp&quality=100)

Process

![image(1)](https://media.ffycdn.net/eu/developer-relations/hKTuVst9yS5tFqxMEftU.jpg?width=750&format=webp&quality=100)

Result

When a ratio is provided, cover will extract the biggest possible area that satisfies the ratio and is as centered on the focus point as possible. For instance, focus=85x85/cover=1:1 will behave as follows:

![cat-300-cover-ratio-process](https://media.ffycdn.net/eu/developer-relations/fVotAY36qXFpbDkNRvBf.jpg?width=300&format=webp&quality=100)

Process

![cat-300](https://media.ffycdn.net/eu/developer-relations/AGUewwHTXM6aYEMukqMv.jpg?width=750&format=webp&quality=100)

Result

### cover-max

Syntax: cover-max=<[pixel size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY)\>

A conditional version of cover that will be applied only when one of the given lengths is smaller than the corresponding input image dimension.

### cover-min

Syntax: cover-min=<[pixel size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY)\>

A conditional version of cover that will be applied only when one of the given lengths is larger than the corresponding input image dimension.

* * *

crop
----

Syntax: crop=<[crop size](https://developer.frontify.com/r/AwWKyW3i8YHnYwxvENJodHH2724mLsbd2aGC2ZFfvto)\>\[@<[coordinates](https://developer.frontify.com/r/REwdwQjxCosRQNQEMeWQcnIt4YfzlZrSaxnSgKBoDJk)\>\]

crop will extract a zone from the image whose size is the given crop size. If no coordinates are given, the focus point will be used as a guide to determine where to start the extraction. If coordinates are given, they will be used to determine the top-left pixel from which to start the extraction, and the focus point will be reset to the center of the resulting image.

Example

crop=200x100

![](https://media.ffycdn.net/eu/developer-relations/qEcYoee95Bi2x8jwjGYM.jpg?width=300&format=webp&quality=100)

Process

![](https://media.ffycdn.net/eu/developer-relations/6ZNzVicaJYcAkmxXQk9G.jpg?width=200&format=webp&quality=100)

Result

Example

crop=200x100@20x50

![](https://media.ffycdn.net/eu/developer-relations/hecfPzmdgoWb8FD9edxP.jpg?width=300&format=webp&quality=100)

Process

![cat-300](https://media.ffycdn.net/eu/developer-relations/ESD1Zxapkdmv5EwqWeVj.jpg?width=200&format=webp&quality=100)

Result

* * *

deuteranopia
------------

Syntax:

*   deuteranopia=<[number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ)\>
    
*   deut=<[number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ)\>
    
*   deuteranopia
    
*   deut
    

Corrects the colors of the image for color blind people suffering from deuteranopia.

The [number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ) provided must be between 0 and 1 and represents the degree of color blindness to correct for. If no [number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ) is provided then 1 (full-color blindness) is assumed.

none

deuteranopia=0.5

deuteranopia

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

* * *

download
--------

Syntax:

*   download
    
*   download=<basename>
    
*   download=<basename>.<extension>
    

Forces media to be downloaded rather than displayed in the browser when the URL containing the transformation is used as a link href or entered in the address bar.

When no parameter is given, the filename will have a basename based on the type of media and with an extension corresponding to the output format of the media (.mp4, .webp, etc.).

For instance:

*   image.webp
    
*   video.mp4
    

If only a basename is given, the extension will still correspond to the media's output format (.jpeg, .webm, etc.).

| Examples |   
 |
| --- | --- |
| `download=birds` | `birds.webm` |
| `download=road` | `road.jpeg` |

If both a basename and an extension are given they will constitute the full filename. Only use this option when you know the actual output format of the media in order to use the correct file extension.

* * *

flip
----

Syntax: flip=<[axis](https://developer.frontify.com/r/P3cSnVtV3GEC5DLPerl4vAFRQ9vc6i8HuIzUPADRkP0)\>

flip will invert the image horizontally, vertically, or both, depending on the axis provided.

both

Axis: horizontal and vertical

x

Axis: horizontal

y

Axis: vertical

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

* * *

focus
-----

Syntax:

*   focus=<[coordinates](https://developer.frontify.com/r/REwdwQjxCosRQNQEMeWQcnIt4YfzlZrSaxnSgKBoDJk)\>
    
*   focus=<[anchor](https://developer.frontify.com/r/PytP8slzQ8T0TPcw7SNNNloWPOg9ANks_QMnkHkvNO8)\>
    
*   focus=auto
    

focus will set the focus point coordinates. It doesn't modify the output image in any way but will change the behavior of further transformations that take the focus point into account (namely cover, crop and zoom).

If an [anchor](https://developer.frontify.com/r/PytP8slzQ8T0TPcw7SNNNloWPOg9ANks_QMnkHkvNO8) is provided, the focus point will be the corresponding corner or the middle point of the corresponding border.

If auto is used instead of actual coordinates, the focus point will be chosen automagically for you!

* * *

* * *

from
----

Syntax: from=<[number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ)\>

If the source media is a video, from will extract a preview image from the given mark.

Mark is a position in seconds that can be an integer as well as a real number (i.e., from=1, from=5.75, etc).

* * *

inside
------

Syntax: inside=<[size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY)|[ratio](https://www.twicpics.com/docs/reference/parameters#ratio)\>

inside behaves like the CSS background-size "contain". It will resize the image so that it completely fits inside the target area. Contrary to the contain transformation, translucent borders will be added if the resulting aspect ratio is not the same as the aspect ratio of the input so that the resulting image has the exact physical size specified.

If the background transformation is used, the background color will fill the borders. If you wish to use a different color than the background color for the added borders, you can use the border transformation.

inside=150x150

background=black/inside=150x150

background=black/border=cyan/inside=150x150

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

* * *

max
---

Syntax: max=<[pixel size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY)\>

Alias of contain-max.

* * *

min
---

Syntax: min=<[pixel size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY)\>

Alias of contain-min.

* * *

output
------

Syntax:

*   output=<format>
    
*   output=<preview type>
    
*   output=auto
    

Specifies the output format. It can be an image format or a preview format. Only the last output in the manipulation expression is taken into account. By default, the Media Processing service will "smart-guess" the best output format for the browser currently issuing the request, but you can use output to override this behavior.

Available image formats are:

*   avif for [AV1 Image File Format](https://en.wikipedia.org/wiki/AV1#AV1_Image_File_Format_\(AVIF\))﻿
    
*   heif for [High Efficiency Image File Format](https://wikipedia.org/wiki/High_Efficiency_Image_File_Format)﻿
    
*   image (jpeg or webp depending on the browser, useful to extract the first frame of a video)
    
*   jpeg for [Joint Photographic Experts Group](https://wikipedia.org/wiki/JPEG)﻿
    
*   png for [Portable Network Graphics](https://wikipedia.org/wiki/Portable_Network_Graphics)﻿
    
*   webp for [WebP](https://wikipedia.org/wiki/WebP)﻿
    

Available preview types are:

*   blank: a blank, totally translucent version of the resulting image
    
*   blurhash: a small text-based representation of the image (see [BlurHash](https://blurha.sh))
    
*   maincolor: a solid color image containing the most important color in the resulting image
    
*   meancolor: a solid color image containing the mean color of the resulting image
    
*   preview: a blurry preview of the resulting image
    

For videos and by default, previews are based on the first frame of the resulting video. You can use the from transformation to target a specific frame.

output=blank

output=maincolor

output=meancolor

output=preview

original image

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

Please note that blank, maincolor, meancolor and preview are distributed with a X-Robots-Tag: noindex header so that they are not indexed by search engines.

* * *

page
----

Syntax: page=<number\>  
﻿  
﻿If the source media is a PDF, page will render a preview image of the given page.  
﻿  
﻿The number provided must be a non-negative integer representing the zero-based index of the page to render.  
﻿  
﻿For instance, page=0 will render a preview image of the first page, page=1 the second page, and so on.  
﻿  
﻿By default, if no page transformation is specified, the first page (0) is used.

* * *

protanopia
----------

Syntax:

*   protanopia=<[number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ)\>
    
*   prot=<[number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ)\>
    
*   protanopia
    
*   prot
    

Corrects the colors of the image for color-blind people suffering from protanopia.

The [number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ) provided must be between 0 and 1 and represents the degree of color blindness to correct for. If no [number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ) is provided then 1 (full-color blindness) is assumed.

none

protanopia=0.5

protanopia

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

* * *

quality
-------

Syntax: quality=<[number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ)\>

Specifies the output quality as a number between 1 and 100.

Note that quality will be ignored when:

*   output is png and truecolor is on
    
*   output is a preview format
    

### quality-max

Syntax: quality-max=<[number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ)\>

A conditional version of quality that will be applied only when the given quality is below the current quality.

| Examples | Resulting quality |
| --- | --- |
| `quality=100/quality-max=50` | `50` |
| `quality=20/quality-max=50` | `20` |
| `quality-max=50/quality=100` | `100` |

### quality-min

Syntax: quality-min=<[number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ)\>

A conditional version of quality that will be applied only when the given quality is above the current quality.

| Examples | Resulting quality |
| --- | --- |
| `quality=100/quality-min=50` | `100` |
| `quality=20/quality-min=50` | `50` |
| `quality-min=50/quality=20` | `20` |

* * *

refit
-----

Syntax: refit=<[size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY)|[ratio](https://developer.frontify.com/r/43X2RxwSL7Tma9sGHf3nd3BVKfKPM7DrF9qubN9XoVU)\>\[@<[anchor](https://developer.frontify.com/r/PytP8slzQ8T0TPcw7SNNNloWPOg9ANks_QMnkHkvNO8)\>\]\[([padding](https://developer.frontify.com/r/vxw8bRbO5KKnGet6p11xSxzu9wc5qdFrB3pvh75j6Rw))\]

Alias of refit-cover.

### refit-cover

Syntax: refit-cover=<[size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY)|[ratio](https://developer.frontify.com/r/43X2RxwSL7Tma9sGHf3nd3BVKfKPM7DrF9qubN9XoVU)\>\[@<[anchor](https://developer.frontify.com/r/PytP8slzQ8T0TPcw7SNNNloWPOg9ANks_QMnkHkvNO8)\>\]\[([padding](https://developer.frontify.com/r/vxw8bRbO5KKnGet6p11xSxzu9wc5qdFrB3pvh75j6Rw))\]

refit-cover will resize the image to the specified size while maximizing the area occupied by the main object (or objects) found within said image.

original image

refit-cover=1:1

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

By default, the subject will be placed at the center of the resulting image but it is possible to align the subject with a given border by specifying an [anchor](https://developer.frontify.com/r/PytP8slzQ8T0TPcw7SNNNloWPOg9ANks_QMnkHkvNO8).

refit-cover=1:1@left

refit-cover=1:1@right

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

Also by default, the subject will touch the borders of the resulting image. This can be avoided by adding [padding](https://developer.frontify.com/r/vxw8bRbO5KKnGet6p11xSxzu9wc5qdFrB3pvh75j6Rw).

It is generally easier to use padding values in percentage so that the added breathing room is independent of previous scalings.

refit-cover=1:1

refit-cover=1:1(15p)

refit-cover=1:1(30p,0,5p)

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

info

Note that refit-cover will never create pixels that are not present in the original image.

If there are not enough pixels in the original image to satisfy a given padding, as many pixels as available will be used, which may create a smaller padding region than expected.

If there are not enough pixels on the opposing side of the anchor point, then the same best-effort approach will be used, and the subject may be farther from the anchor point than expected.

If placement is paramount to you, please use refit-inside instead.

### refit-inside

Syntax: refit-inside=<[size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY)|[ratio](https://developer.frontify.com/r/43X2RxwSL7Tma9sGHf3nd3BVKfKPM7DrF9qubN9XoVU)\>\[@<[anchor](https://developer.frontify.com/r/PytP8slzQ8T0TPcw7SNNNloWPOg9ANks_QMnkHkvNO8)\>\]\[([padding](https://developer.frontify.com/r/vxw8bRbO5KKnGet6p11xSxzu9wc5qdFrB3pvh75j6Rw))\]

refit-inside will resize the image to the specified size while ensuring the main object (or objects) are perfectly centered, even if it means borders have to be created in the process.

original image

refit-inside=1:1

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

By default, the subject will be placed at the center of the resulting image, but it is possible to align the subject with a given border by specifying an [anchor](https://www.twicpics.com/docs/reference/parameters#anchor).

refit-inside=1:1@left

refit-inside=1:1@right

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

Also by default, the subject will touch the borders of the resulting image. This can be avoided by adding [padding](https://developer.frontify.com/r/vxw8bRbO5KKnGet6p11xSxzu9wc5qdFrB3pvh75j6Rw).

It is generally easier to use padding values in percentage so that the added breathing room is independent of previous scalings.

refit-inside=1:1

refit-inside=1:1(15p)

refit-inside=1:1(30p,0,5p)

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

* * *

resize
------

Syntax: resize=<[size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY)|[ratio](https://developer.frontify.com/r/43X2RxwSL7Tma9sGHf3nd3BVKfKPM7DrF9qubN9XoVU)\>

resize will resize the image to the specified size. If only one length is provided, the other dimension will be determined to respect the aspect ratio of the input image. If both lengths are provided, the aspect ratio may not be respected.

resize=150

resize=-x150

resize=150x150

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

If a ratio is provided, the image will be resized so that it stays as close as possible to its current surface (i.e., number of pixels) while respecting the given aspect ratio as closely as possible.

For instance, resize=4:3 will result in the following 274x206 image:

![cat-300](https://media.ffycdn.net/eu/developer-relations/VHrqUcrRYpJYGMsKiDrw.jpg?width=274&format=webp&quality=100)

The 300x188 image was resized to a 274x206 image (respecting the 4:3 ratio as best as possible). The initial surface was (300x188=) 56,400 pixels. The final surface is (274x206=) 56,444 pixels.

### resize-max

Syntax: resize-max=<[pixel size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY)\>

A conditional version of resize that will be applied only when one of the given lengths is smaller than the corresponding input image dimension.

### resize-min

Syntax: resize-min=<[pixel size](https://developer.frontify.com/r/B5hRORrpZhsCDmYaORHhkoWu3thpen1sq-A1RDyBjpY)\>

A conditional version of resize that will be applied only when one of the given lengths is larger than the corresponding input image dimension.

* * *

tritanopia
----------

Syntax:

*   tritanopia=<[number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ)\>
    
*   trit=<[number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ)\>
    
*   tritanopia
    
*   trit
    

Corrects the colors of the image for color-blind people suffering from protanopia.

The [number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ) provided must be between 0 and 1 and represents the degree of color blindness to correct for. If no [number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ) is provided then 1 (full-color blindness) is assumed.

none

tritanopia=0.5

tritanopia

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

* * *

truecolor
---------

Syntax:

*   truecolor=<[boolean](https://developer.frontify.com/r/t6J2Wo0gu2UcofmZZTuuhmPktJLdkfvujUHsoHv0iFs)\>
    
*   truecolor
    

truecolor can be used to prevent color quantization. If no boolean is provided, true is assumed. By default, quantization is allowed (truecolor=false).

When may quantization occur? Whenever the output format is png. By default, the Media Processing service quantizes colors to reduce the size of the output image. It is possible to prevent this behavior by setting truecolor to true.

Be aware that the Media Processing service will automatically output PNG images when:

*   no output format is specified,
    
*   the source image has an alpha channel,
    
*   and the target browser does not support WebP.
    

As such, use truecolor if you want to distribute substantially larger but more accurate images with translucency to users on browsers that do not support WebP.

* * *

turn
----

Syntax: turn=<[angle](https://developer.frontify.com/r/fg-D_9V6cRfRC9lg9vntBQxd9e9HwJn2pGosDShA0JE)\>

turn will change the orientation of the image. It accepts an [angle](https://developer.frontify.com/r/fg-D_9V6cRfRC9lg9vntBQxd9e9HwJn2pGosDShA0JE). Angles will be rounded to the closest multiple of 90°.

turn=flip

Angle: 180°

turn=left

Angle: -90°

turn=right

Angle: 90°

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.

* * *

zoom
----

Syntax: zoom=<[number](https://developer.frontify.com/r/qyV8rFRCpxxZ9QivKgPzyhNrBIXF2FmghRN1MrmcsAQ)\>

zooms into the image by a factor equal or superior to 1 towards the focus point while preserving the image size.

zoom=1

zoom=1.5

zoom=2

zoom=3

To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space again to drop the item in its new position, or press escape to cancel.