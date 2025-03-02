# Setup.py allows audius-discovery-provider as a redistributable package
# Currently, the repository is not configured as such but may be moving forward
# https://caremad.io/posts/2013/07/setup-vs-requirement/
import uuid

from pip._internal.req import parse_requirements
from setuptools import find_packages, setup

install_reqs = parse_requirements("requirements.txt", session=uuid.uuid1())  # type: ignore
requirements = [str(ir.requirement) for ir in install_reqs]

setup(
    name="audius_discovery_provider",
    version="0.1",
    description="Audius Discovery Provider",
    author="Hareesh Nagaraj",
    author_email="",
    url="",
    download_url="",
    packages=find_packages(),
    requires=requirements,
    scripts=[],
)
