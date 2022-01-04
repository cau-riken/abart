# AbART - ANTs based Atlas Registration Tool

This is a web based interactive tool to register MRI volumes to the Marmoset Atlas.

Users can load and visualize their MRI volumes (NIfTI-1 format), interactively reorient them (to allow correct registration), then submit registration, and finally retrieve registered volume.

It is implemented following a multi-container architecture, since actual registration process are intended to run remotely, but it can also be used in "Desktop" mode where all components run on the same machine.
