num = 10
name = "Apeksha"
marks = [85, 90, 95]

print(isinstance(num, int))      # True
print(isinstance(name, str))     # True
print(isinstance(marks, list))   # True
print(isinstance(num, str))      # False

value = 25

if isinstance(value, int):
    print("It is an integer")

elif isinstance(value, float):
    print("It is a float")

else:
    print("Unknown type")

num = 5.5

print(isinstance(num, (int, float)))   # True
