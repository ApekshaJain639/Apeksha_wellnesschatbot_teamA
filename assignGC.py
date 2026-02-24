import gc

print("Garbage Collector Enabled:", gc.isenabled())

# Creating objects
a = [1, 2, 3]
b = a

print("Reference count before deleting:", gc.get_count())

# Delete reference
del a

# Manually run garbage collector
gc.collect()

print("Garbage Collection Done")

import sys

x = [10, 20, 30]

print("Reference count:", sys.getrefcount(x))

y = x
print("Reference count after assigning y:", sys.getrefcount(x))
