# Linear Fit

This algorithm attempts to normalize the red, green, and blue channels. It computes the channel with the highest median, then determines a linear offset for the other two channels and applies it. It is an approximation of what happens if you split the RGB channels and then use the Linear Fit tool to apply the channel with the highest intensity to the lower intensity channels.

|Use a single RGB/K expression|Linear|Non-linear|Color|Grayscale|
|:-:|:-:|:-:|:-:|:-:|
|N|Y|Y|Y|N|

**Symbols** 

```
w = width($T),
h = height($T),
medR = median($T,0),
medG = median($T,1),
medB = median($T,2),
procR,
procG,
procB,
maxRG,
maxGB,
maxV,
factor
```

**R/K**
```
procR = iif(medR < medG || medR < medB, 1, 0);
maxRG = iif(medR < medG, medG, medR);
maxGB = iif(medG < medB, medB, medG);
maxV = iif(maxRG < maxGB, maxGB, maxRG);
factor = maxV / medR;
iif (procR == 1, $T*factor, $T);
```

**G**
```
procG = iif(medG < medR || medG < medB, 1, 0);
maxRG = iif(medR < medG, medG, medR);
maxGB = iif(medG < medB, medB, medG);
maxV = iif(maxRG < maxGB, maxGB, maxRG);
factor = maxV / medG;
iif (procG == 1, $T*factor, $T);
```

**B**
```
procB = iif(medB < medR || medB < medG, 1, 0);
maxRG = iif(medR < medG, medG, medR);
maxGB = iif(medG < medB, medB, medG);
maxV = iif(maxRG < maxGB, maxGB, maxRG);
factor = maxV / medB;
iif (procB == 1, $T*factor, $T);
```

**A**
(none)