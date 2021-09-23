# AlgoMarble (Shader NFTs on Cardano)

'AlgoMarble' is a generative art project by Frank Hampus Weslien.
You are free to download, modify, and share the code. But remember: if you want
to use it create your own NFT:s make sure that you've modified it enough that it
has become something new/novel.

## Links

* [Youtube Video](https://www.youtube.com/watch?v=q1AVe5wOdR4&t=6s)
* [AlgoMarble Collection](https://www.frankhampusweslien.com/art?group=AlgoMarble&search=&forSale=False&pageSize=24&page=0)

## Dependencies

It uses python 3 (no libraries) and glslViewer. They need to be installed for the
program to run.

## Basics of how it works

### Overview

The basic idea is to stack a bunch of noise on top of each other and then map that
noise into pretty colors. If you want to know how I recommend checking out the code in the
`AlgoMarble.frag` shader.

Now, shaders are deterministic so noise has to be added from outside:
hence there is a python script. It selects parameters for the shaders based on a seed
(in the original collection I used the seeds 0-511). I've saved the seeds, but 
also the parameters values the seeds generated. You will find what values a specific
NFT has by looking at its metadata. 

Q: But why did you use glslViewer???  
A: It was the first approach that didn't choke when I increased the 
image resolution to 6000 by 4000 pixels on my shitty laptop. 
I want you to be able to recreate the NFTs in high resolution if you need to.

### Files

#### 'AlgoMarble.frag'

This is the shader that ultimately generates the art and is written in OpenGL.
If you've never encountered OpenGl before the best way to think about it describes 
a (deterministic) function that gets applied to every pixel. Shaders runs on your 
graphics cards and are really fast which is why I'm using it.

#### 'input.csv'

This file a list of commands (formatted as CSV because that is what glslViewer expects)
that can be modified to easily recreate any of the artworks in the 'AlgoMarble' collection.

Each line in the file is a command to glslViewer. 
The first series of command all sets input parameters to the shader (usually called uniforms)
then asks glslViewer to perform a screenCapture and save it as a PNG image and then exit.

#### 'script.py'

A script that can recreate any number of artworks in the 'AlgoMarble' collection. 
It was also used to create the original collection that
was minted as NFTs in September of 2021.

## How to recreate

### Option 1 (No Python)

If you have no interest in installing python you can recreate one of the artworks
by copying the parameters in your CNFT (Cardano Non-Fungible Token) transaction 
metadata into the `input.csv` file. Simply replace the values in the file
with your values and then run:

```bash
cat input.csv | glslViewer AlgoMarble.frag -w 1200 -h 800 --headless
```

It will generate a PNG image of 1200 by 800 pixels, you can easily modify the command
to generate an output in any size that you'd like.

### Option 2 (With Python)

The basic command is:

```bash
python3 script.py --width 1200 --height 800 --start 0 --end 512  
```

You can obviously modify it to your liking...
If you need any help you can use the `-h` command:

```bash
python3 script.py -h
```


## Animations

If you want to recreate the animations from the [youtube video](https://www.youtube.com/watch?v=q1AVe5wOdR4&t=6s)
use the following command:

```bash
cat input-youtube.csv | glslViewer AlgoMarbleYoutube.frag -w 1200 -h 800
```
