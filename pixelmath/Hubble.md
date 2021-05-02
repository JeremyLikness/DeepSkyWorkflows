# Hubble Palette

This is a fun, artistic transformation that effectively swaps the red and green channels with some weighting. It is based loosely on the algorithm to combine filters for the Hubble palette, but is based solely on manipulation of the red, green, and blue channels.

|Use a single RGB/K expression|Linear|Non-linear|Color|Grayscale|
|:-:|:-:|:-:|:-:|:-:|
|N|Y|Y|Y|N|

**Symbols** 
(none)

**R/K**
```
$T[1]
```

**G**
```
0.8*$T[0]+0.2*$T[2]
```

**B**
```
$T[2]
```

**A**
(none)
