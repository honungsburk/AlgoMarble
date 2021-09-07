
import subprocess
import argparse
import random
import os
import json

# glslVeiwer command to take a screenshot
# This command is used to create images
def screenshotCommand(name):
    return ['screenshot', name + '.png']

# Exit glslViewer
def exitCommand():
    return ['exit']

# Commands are piped as CSV to glslViewer and since our demands are very small
# we implement it ourselves rather then relying on any library
def commandsToString(commands):
    commands_s = ''
    for command in commands:
        is_first = True
        for part in command:
            if is_first:
                commands_s += part
                is_first = False
            else:
                commands_s +=  ', ' + part
        commands_s += '\n'
    
    return commands_s

# Take the dictionary and turn it into a list of lists
# that is a simple representation of a series of commands
def to_uniform_commands(uniforms):
    commands = []
    for uniform in uniforms:
        command = [uniform]
        params = uniforms[uniform]
        if isinstance(params, float):
            command.append(str(params))
        else: 
            for param in params:
                command.append(str(param))

        commands.append(command)

    return commands

def create_uniforms(seed):
    random.seed(a=seed, version=2)

    u_q_fbm_displace_1 = (random.uniform(0, 20), random.uniform(0, 20))
    u_q_fbm_displace_2 = (random.uniform(0, 20), random.uniform(0, 20))
    u_r_fbm_displace_1 = (random.uniform(0, 20), random.uniform(0, 20))
    u_r_fbm_displace_2 = (random.uniform(0, 20), random.uniform(0, 20))
    
    # This gives a chance for beautiful symmetries
    symmetry = random.random()
    if symmetry < 0.1:
        u_q_fbm_displace_2 = u_q_fbm_displace_1
        u_r_fbm_displace_1 = u_q_fbm_displace_1
        u_r_fbm_displace_2 = u_q_fbm_displace_1
    elif symmetry < 0.2:
        u_q_fbm_displace_2 = u_q_fbm_displace_1
        u_r_fbm_displace_2 = u_r_fbm_displace_1
    elif symmetry < 0.3:
        u_r_fbm_displace_1 = u_q_fbm_displace_1
        u_r_fbm_displace_2 = u_q_fbm_displace_2

    return {
        'u_numOctaves' : random.uniform(8, 16),
        'u_zoom' : random.uniform(0.4, 1.6),
        'u_cc' : (random.uniform(10, 20), random.uniform(10, 20), random.uniform(10, 20)), 
        'u_dd': (random.random(), random.random(), random.random()), 
        'u_q_h': (random.uniform(0.7, 1.3), random.uniform(0.7, 1.3)), 
        'u_r_h': (random.uniform(0.7, 1.3), random.uniform(0.7, 1.3)),
        'u_pattern_h': random.uniform(0.8, 1.2),
        'u_center_point': (random.random(), random.random()),
        'u_pixel_distance_choice': random.random(),
        'u_interpolation_choice': random.uniform(0.0, 3.0),
        'u_q_fbm_displace_1': (random.uniform(0, 20), random.uniform(0, 20)),
        'u_q_fbm_displace_2': (random.uniform(0, 20), random.uniform(0, 20)),
        'u_r_fbm_displace_1': (random.uniform(0, 20), random.uniform(0, 20)),
        'u_r_fbm_displace_2': (random.uniform(0, 20), random.uniform(0, 20)),
        'u_color_speed': random.uniform(0.5, 1.0),
    }

if __name__ == "__main__":

    parser = argparse.ArgumentParser(description='Generate PNG images from the AlgoMarble NFT Series.')
    parser.add_argument('--width', metavar='PIXELS', type=int, default=1200,
                        help='the width of the image in pixels')
    parser.add_argument('--height', metavar='PIXELS', type=int, default=800,
                        help='the width of the image in pixels')
    parser.add_argument('--start', metavar='INT', type=int, default=0,
                        help='starting seed when generating images (inclusive)')
    parser.add_argument('--end', metavar='INT', type=int, default=512,
                        help='ending seed when generating images (non-inclusive)')


    args = parser.parse_args()

    shaderPath = 'AlgoMarble.frag'

    glslCommand = ' '.join(['glslViewer', shaderPath, '--headless', '-w', str(args.width), '-h', str(args.height)])

    print('Running command:')
    print(glslCommand)


    for seed in range(args.start, args.end):
        glslViewer = subprocess.Popen( glslCommand
                                    , stdin=subprocess.PIPE
                                    , stdout=subprocess.PIPE
                                    , encoding='utf8'
                                    , shell=True)
        print(seed)
        uniforms = create_uniforms(seed)
        
        path = str(seed)

        # Create commands to send to glslViewer
        uniform_commands = to_uniform_commands(uniforms)
        uniform_commands.append(screenshotCommand(path))
        uniform_commands.append(exitCommand())
        commands_as_string = commandsToString(uniform_commands)
        print(commands_as_string)
        # Will block until all images has been rendered
        glslViewer.communicate(commands_as_string)

        with open(path + ".json", "w") as json_file:
            json.dump(uniforms, json_file, indent = 4) 

    
