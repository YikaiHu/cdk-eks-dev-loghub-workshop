FROM openjdk:11-jre

RUN yum update -y && amazon-linux-extras install -y java-openjdk11

RUN wget https://aws-gcr-solutions.s3.amazonaws.com/log-hub-workshop/v1.0.0/petstore-0.0.1-SNAPSHOT.jar

COPY java.sh .
RUN chmod +x java.sh
ENTRYPOINT ["./java.sh"]